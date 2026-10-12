import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MerchantApplicationEntity } from '@modules/applications/entities/merchant-application.entity';
import { ApplicationStatus } from '@core/enums/application-status.enum';
import { RiskStatus } from '@core/enums/risk-status.enum';
import { Role } from '@core/enums/roles.enum';
import { AuditService } from '@modules/audit/audit.service';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
} from './dto/application.dto';
import { IUser } from '@core/interfaces/user.interface';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(MerchantApplicationEntity)
    private repo: Repository<MerchantApplicationEntity>,
    @InjectQueue('risk-review') private riskQueue: Queue,
    private auditService: AuditService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateApplicationDto,
    userId: string,
  ): Promise<MerchantApplicationEntity> {
    const app: MerchantApplicationEntity = this.repo.create({
      ...dto,
      createdById: userId,
      status: ApplicationStatus.DRAFT,
    });

    // 2. 'saved' is now guaranteed to be a single entity, not an array
    const saved = await this.repo.save(app);

    this.auditService.logAction(
      'CREATE_APPLICATION',
      'MerchantApplication',
      saved.id,
      userId,
      dto,
    );

    return saved;
  }

  async list(filter: any, user: any) {
    const query = this.repo.createQueryBuilder('app');

    // Strict isolation for list views
    if (user.role === Role.SALES)
      query.andWhere('app.createdById = :userId', { userId: user.id });
    if (filter.status)
      query.andWhere('app.status = :status', { status: filter.status });

    const [items, total] = await query
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();

    return { items, total, page: filter.page, limit: filter.limit };
  }

  async update(
    id: string,
    dto: UpdateApplicationDto,
    user: IUser,
    expectedVersion: number,
  ) {
    const result = await this.repo
      .createQueryBuilder()
      .update(MerchantApplicationEntity)
      .set({ ...dto })
      .where('id = :id', { id })
      .andWhere('version = :expectedVersion', {
        expectedVersion,
      })
      .andWhere('status IN (:...statuses)', {
        statuses: [ApplicationStatus.DRAFT, ApplicationStatus.NEEDS_INFO],
      });

    if (user.role === Role.SALES) {
      result.andWhere('"createdById" = :userId', {
        userId: user.id,
      });
    }

    const updateResult = await result.execute();

    if (updateResult.affected !== 1) {
      throw new ConflictException(
        'Application was modified or cannot be updated',
      );
    }

    return this.findOne(id, user);
  }

  async submit(
  app: MerchantApplicationEntity,
  userId: string,
): Promise<MerchantApplicationEntity> {
  if (app.createdById !== userId) {
    throw new NotFoundException('Application not found');
  }

  if (
    ![
      ApplicationStatus.DRAFT,
      ApplicationStatus.NEEDS_INFO,
    ].includes(app.status)
  ) {
    throw new BadRequestException(
      'Only DRAFT or NEEDS_INFO applications can be submitted.',
    );
  }

  const saved = await this.repo.save(
    this.repo.merge(app, {
      status: ApplicationStatus.SUBMITTED,
      riskStatus: RiskStatus.PENDING,
      submittedAt: new Date(),
    }),
  );

  const jobId = `risk-${saved.id}-${saved.version}`;

  console.log('[RISK] Submitting application:', saved.id);
  console.log('[RISK] Risk status:', saved.riskStatus);
  console.log('[RISK] Job ID:', jobId);

  const job = await this.riskQueue.add(
    'evaluate',
    {
      id: saved.id,
      version: saved.version,
    },
    {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  );

  console.log('[RISK] Job ID returned:', job.id);
  console.log('[RISK] Job state:', await job.getState());

  await this.auditService.logAction(
    'SUBMIT_APPLICATION',
    'MerchantApplication',
    saved.id,
    userId,
    {
      riskStatus: saved.riskStatus,
      jobId: job.id,
    },
  );

  return saved;
}

  async assignReviewer(
    app: MerchantApplicationEntity,
    reviewerId: string,
    assignerId: string,
  ): Promise<MerchantApplicationEntity> {
    // 1. Verify reviewer exists and has REVIEWER role
    const reviewer = await this.userRepository.findOne({
      where: {
        id: reviewerId,
        role: Role.REVIEWER,
      },
    });

    if (!reviewer) {
      throw new BadRequestException(
        'Invalid reviewer. Only users with REVIEWER role can be assigned.',
      );
    }

    // 2. Validate application lifecycle
    if (
      ![ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW].includes(
        app.status,
      )
    ) {
      throw new ConflictException(
        'Only submitted or under-review applications can be assigned.',
      );
    }

    // 3. Prevent duplicate assignment
    if (app.assignedReviewerId === reviewerId) {
      throw new ConflictException(
        'Application is already assigned to this reviewer.',
      );
    }

    // 4. Assign reviewer
    app.assignedReviewerId = reviewer.id;
    app.status = ApplicationStatus.UNDER_REVIEW;

    const saved = await this.repo.save(app);

    // 5. Record audit log
    await this.auditService.logAction(
      'ASSIGN_REVIEWER',
      'MerchantApplication',
      saved.id,
      assignerId,
      {
        reviewerId: reviewer.id,
        previousStatus: app.status,
        newStatus: saved.status,
      },
    );

    return saved;
  }

  async recordDecision(
    app: MerchantApplicationEntity,
    dto: any,
    reviewerId: string,
  ) {
    if (app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Decisions can only be made when UNDER_REVIEW.',
      );
    }
    if (app.riskStatus === RiskStatus.PENDING) {
      throw new BadRequestException(
        'Cannot decide while Risk Review is pending.',
      );
    }

    app.status = dto.decision;
    const saved = await this.repo.save(app);
    this.auditService.logAction(
      'RECORD_DECISION',
      'MerchantApplication',
      saved.id,
      reviewerId,
      dto,
    );
    return saved;
  }

  async findOne(id: string, user: IUser): Promise<MerchantApplicationEntity> {
    const query = this.repo
      .createQueryBuilder('app')
      .where('app.id = :id', { id });

    switch (user.role) {
      case Role.ADMIN:
        // ADMIN can view all applications.
        break;

      case Role.SALES:
        // SALES can only view applications they created.
        query.andWhere('app.createdById = :userId', {
          userId: user.id,
        });
        break;

      case Role.REVIEWER:
        // REVIEWER can only view assigned applications.
        query.andWhere('app.assignedReviewerId = :userId', {
          userId: user.id,
        });
        break;

      default:
        throw new ForbiddenException('Access denied');
    }

    const application = await query.getOne();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }
}
