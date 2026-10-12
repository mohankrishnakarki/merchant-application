import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';
import request from 'supertest';

import { ApplicationsController } from '@modules/applications/applications.controller';
import { ApplicationsService } from '@modules/applications/applications.service';
import { MerchantApplicationEntity } from '@modules/applications/entities/merchant-application.entity';
import { ApplicationAccessGuard } from '@modules/applications/guards/application-access.guard';

import { User } from '@modules/users/entities/user.entity';
import { AuditService } from '@modules/audit/audit.service';

import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RolesGuard } from '@core/guards/roles.guard';

import { Role } from '@core/enums/roles.enum';
import { ApplicationStatus } from '@core/enums/application-status.enum';
import { RiskStatus } from '@core/enums/risk-status.enum';

describe('Applications Integration (e2e)', () => {
  let app: INestApplication;

  const applicationId = '6031bb72-2aff-472d-aa74-f04e19276a89';
  const salesId = '6031bb72-2aff-472d-aa74-f04e19276a90';
  const reviewerId = '6031bb72-2aff-472d-aa74-f04e19276a91';
  const adminId = '6031bb72-2aff-472d-aa74-f04e19276a92';

  const users = {
    sales: {
      id: salesId,
      email: 'sales@example.com',
      role: Role.SALES,
    },
    reviewer: {
      id: reviewerId,
      email: 'reviewer@example.com',
      role: Role.REVIEWER,
    },
    admin: {
      id: adminId,
      email: 'admin@example.com',
      role: Role.ADMIN,
    },
  };

  type TestUser = (typeof users)[keyof typeof users];

  let currentUser: TestUser = users.sales;

  const createApplicationDto = {
    businessName: 'ABC Trading',
    registrationNumber: 'REG-123456',
  };

  const buildApplication = (
    overrides: Record<string, unknown> = {},
  ) => ({
    id: applicationId,
    ...createApplicationDto,
    createdById: salesId,
    assignedReviewerId: null,
    status: ApplicationStatus.DRAFT,
    riskStatus: RiskStatus.PENDING,
    version: 1,
    ...overrides,
  });

  let storedApplication = buildApplication();

  const mockQueryBuilder: any = {
    where: jest.fn(),
    andWhere: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    execute: jest.fn(),
  };

  const mockApplicationRepository = {
    create: jest.fn<(...args: any[]) => any>(),
    save: jest.fn<(...args: any[]) => Promise<any>>(),
    merge: jest.fn<(...args: any[]) => any>(),
    findOne: jest.fn<(...args: any[]) => Promise<any>>(),
    createQueryBuilder: jest.fn<(...args: any[]) => any>(),
  };

  const mockUserRepository = {
    findOne: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  const mockRiskQueue = {
    add: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  const mockAuditService = {
    logAction: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  class TestJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = currentUser;
      return true;
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        controllers: [ApplicationsController],
        providers: [
          ApplicationsService,
          RolesGuard,
          ApplicationAccessGuard,
          {
            provide: getRepositoryToken(MerchantApplicationEntity),
            useValue: mockApplicationRepository,
          },
          {
            provide: getRepositoryToken(User),
            useValue: mockUserRepository,
          },
          {
            provide: getQueueToken('risk-review'),
            useValue: mockRiskQueue,
          },
          {
            provide: AuditService,
            useValue: mockAuditService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useClass(TestJwtAuthGuard)
        .compile();

    app = moduleFixture.createNestApplication({
      logger: false,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    currentUser = users.sales;
    storedApplication = buildApplication();

    for (const method of [
      'where',
      'andWhere',
      'skip',
      'take',
      'update',
      'set',
    ]) {
      mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
    }

    mockApplicationRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder,
    );

    mockApplicationRepository.create.mockImplementation(
      (data: any) => ({
        id: applicationId,
        version: 1,
        ...data,
      }),
    );

    mockApplicationRepository.merge.mockImplementation(
      (entity: any, data: any) => Object.assign(entity, data),
    );

    mockApplicationRepository.save.mockImplementation(
      async (entity: any) => entity,
    );

    mockApplicationRepository.findOne.mockImplementation(
      async () => storedApplication,
    );

    mockQueryBuilder.getOne.mockImplementation(
      async () => storedApplication,
    );

    mockQueryBuilder.getManyAndCount.mockResolvedValue([
      [storedApplication],
      1,
    ]);

    mockQueryBuilder.execute.mockResolvedValue({
      affected: 1,
    });

    mockUserRepository.findOne.mockResolvedValue({
      id: reviewerId,
      role: Role.REVIEWER,
    });

    mockRiskQueue.add.mockResolvedValue({
      id: `risk-${applicationId}-1`,
      getState: jest.fn(async () => 'waiting'),
    });

    mockAuditService.logAction.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /applications', () => {
    it('should create a draft application as SALES', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto)
        .expect(201);

      expect(response.body.status).toBe(ApplicationStatus.DRAFT);
      expect(response.body.createdById).toBe(salesId);

      expect(mockApplicationRepository.save).toHaveBeenCalledTimes(1);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'CREATE_APPLICATION',
        'MerchantApplication',
        applicationId,
        salesId,
        expect.any(Object),
      );
    });

    it('should allow ADMIN to create an application', async () => {
      currentUser = users.admin;

      await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto)
        .expect(201);
    });

    it('should reject REVIEWER from creating an application', async () => {
      currentUser = users.reviewer;

      await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto)
        .expect(403);
    });
  });

  describe('GET /applications', () => {
    it('should list applications with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/applications?page=1&limit=10')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items).toHaveLength(1);
    });

    it('should restrict SALES list to their applications', async () => {
      currentUser = users.sales;

      await request(app.getHttpServer())
        .get('/applications?page=1&limit=10')
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'app.createdById = :userId',
        { userId: salesId },
      );
    });

    it('should filter applications by status', async () => {
      await request(app.getHttpServer())
        .get(
          `/applications?page=1&limit=10&status=${ApplicationStatus.DRAFT}`,
        )
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'app.status = :status',
        { status: ApplicationStatus.DRAFT },
      );
    });
  });

  describe('GET /applications/:id', () => {
    it('should allow ADMIN to view an application', async () => {
      currentUser = users.admin;

      const response = await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .expect(200);

      expect(response.body.id).toBe(applicationId);
    });

    it('should allow SALES to view their own application', async () => {
      currentUser = users.sales;

      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .expect(200);
    });

    it('should reject access to nonexistent applications', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .expect(404);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update an application with correct version', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        })
        .expect(200);

      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(1);
      expect(response.body.id).toBe(applicationId);
    });

    it('should return 409 on optimistic locking conflict', async () => {
      mockQueryBuilder.execute.mockResolvedValue({
        affected: 0,
      });

      await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        })
        .expect(409);
    });

    it('should reject invalid version', async () => {
      await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=0`)
        .send({
          businessName: 'Updated Trading',
        })
        .expect(400);
    });

    it('should reject REVIEWER from updating applications', async () => {
      currentUser = users.reviewer;

      await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        })
        .expect(403);
    });
  });

  describe('POST /applications/:id/submit', () => {
    it('should submit application and enqueue risk review', async () => {
      currentUser = users.sales;

      storedApplication = buildApplication({
        status: ApplicationStatus.DRAFT,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`)
        .expect(201);

      expect(response.body.status).toBe(
        ApplicationStatus.SUBMITTED,
      );

      expect(response.body.riskStatus).toBe(
        RiskStatus.PENDING,
      );

      expect(mockRiskQueue.add).toHaveBeenCalledWith(
        'evaluate',
        {
          id: applicationId,
          version: 1,
        },
        expect.objectContaining({
          jobId: `risk-${applicationId}-1`,
          attempts: 3,
        }),
      );

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'SUBMIT_APPLICATION',
        'MerchantApplication',
        applicationId,
        salesId,
        expect.any(Object),
      );
    });

    it('should reject submitting an already submitted application', async () => {
      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`)
        .expect(400);
    });

    it('should reject REVIEWER from submitting', async () => {
      currentUser = users.reviewer;

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`)
        .expect(403);
    });
  });

  describe('POST /applications/:id/assign', () => {
    it('should allow ADMIN to assign a reviewer', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId,
        })
        .expect(201);

      expect(response.body.assignedReviewerId).toBe(reviewerId);

      expect(response.body.status).toBe(
        ApplicationStatus.UNDER_REVIEW,
      );

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'ASSIGN_REVIEWER',
        'MerchantApplication',
        applicationId,
        adminId,
        expect.any(Object),
      );
    });

    it('should reject invalid reviewer', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      mockUserRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId,
        })
        .expect(400);
    });

    it('should reject duplicate reviewer assignment', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,
        assignedReviewerId: reviewerId,
      });

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId,
        })
        .expect(409);
    });

    it('should reject SALES from assigning reviewers', async () => {
      currentUser = users.sales;

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId,
        })
        .expect(403);
    });
  });

  describe('POST /applications/:id/decision', () => {
    it('should allow REVIEWER to approve application', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,
        assignedReviewerId: reviewerId,
        riskStatus: RiskStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        })
        .expect(201);

      expect(response.body.status).toBe(
        ApplicationStatus.APPROVED,
      );

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'RECORD_DECISION',
        'MerchantApplication',
        applicationId,
        reviewerId,
        expect.any(Object),
      );
    });

    it('should reject decision while risk review is pending', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,
        assignedReviewerId: reviewerId,
        riskStatus: RiskStatus.PENDING,
      });

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        })
        .expect(400);
    });

    it('should reject decision when not under review', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.DRAFT,
        riskStatus: RiskStatus.COMPLETED, 
      });

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        })
        .expect(400);
    });

    it('should reject SALES from recording decisions', async () => {
      currentUser = users.sales;

      await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        })
        .expect(403);
    });
  });
});