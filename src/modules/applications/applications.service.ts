import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MerchantApplication } from '@modules/applications/entities/merchant-application.entity';
import { ApplicationStatus, RiskStatus, Role } from '@core/enums/roles.enum';
import { AuditService } from '@modules/audit/audit.service';
import { CreateApplicationDto } from './dto/application.dto';
import { IMerchantApplication } from '@core/interfaces/merchant-application.interface';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(MerchantApplication) private repo: Repository<MerchantApplication>,
    @InjectQueue('risk-review') private riskQueue: Queue,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateApplicationDto, userId: string): Promise<IMerchantApplication> {
    // 1. Explicitly type 'app' to force TypeScript to recognize it as a single entity
    const app: MerchantApplication = this.repo.create({ 
      ...dto, 
      createdById: userId, 
      status: ApplicationStatus.DRAFT 
    });

    // 2. 'saved' is now guaranteed to be a single entity, not an array
    const saved = await this.repo.save(app);
    
    this.auditService.logAction('CREATE_APPLICATION', 'MerchantApplication', saved.id, userId, dto);
    
    return saved;
  }

  async list(filter: any, user: any) {
    const query = this.repo.createQueryBuilder('app');
    
    // Strict isolation for list views
    if (user.role === Role.SALES) query.andWhere('app.createdById = :userId', { userId: user.id });
    if (filter.status) query.andWhere('app.status = :status', { status: filter.status });

    const [items, total] = await query
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();

    return { items, total, page: filter.page, limit: filter.limit };
  }

  async update(app: MerchantApplication, dto: any, userId: string) {
    // Valid State Transition check
    if (![ApplicationStatus.DRAFT, ApplicationStatus.INFO_REQUESTED].includes(app.status)) {
      throw new BadRequestException('Application can only be updated in DRAFT or INFO_REQUESTED states.');
    }
    const updated = await this.repo.save(this.repo.merge(new MerchantApplication(), app, dto));
    this.auditService.logAction('UPDATE_APPLICATION', 'MerchantApplication', app.id, userId, dto);
    return updated;
  }

  async submit(app: MerchantApplication, userId: string) {
    if (![ApplicationStatus.DRAFT, ApplicationStatus.INFO_REQUESTED].includes(app.status)) {
      throw new BadRequestException('Only DRAFT or INFO_REQUESTED applications can be submitted.');
    }

    const saved = await this.repo.save(this.repo.merge(new MerchantApplication(), app, { status: ApplicationStatus.SUBMITTED }));
    this.auditService.logAction('SUBMIT_APPLICATION', 'MerchantApplication', saved.id, userId);

    // Requirement C: Asynchronous Enqueue
    await this.riskQueue.add('evaluate', { id: saved.id }, {
      jobId: `risk-${saved.id}-${saved.version}`, // Prevents duplicate jobs for same version
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
    return saved;
  }

  async assignReviewer(app: MerchantApplication, reviewerId: string, assignerId: string) {
    app.assignedReviewerId = reviewerId;
    app.status = ApplicationStatus.UNDER_REVIEW;
    const saved = await this.repo.save(app);
    this.auditService.logAction('ASSIGN_REVIEWER', 'MerchantApplication', saved.id, assignerId, { reviewerId });
    return saved;
  }

  async recordDecision(app: MerchantApplication, dto: any, reviewerId: string) {
    if (app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException('Decisions can only be made when UNDER_REVIEW.');
    }
    if (app.riskStatus === RiskStatus.PENDING) {
      throw new BadRequestException('Cannot decide while Risk Review is pending.');
    }

    app.status = dto.decision;
    const saved = await this.repo.save(app);
    this.auditService.logAction('RECORD_DECISION', 'MerchantApplication', saved.id, reviewerId, dto);
    return saved;
  }
}