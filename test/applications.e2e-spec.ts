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
import {
  buildCreateApplicationDto,
  buildTestApplication,
  buildTestId,
  buildTestUser,
  TestApplication,
  TestUser,
} from './factories/test-data.factory';

describe('Applications Integration (e2e)', () => {
  let app: INestApplication;

  // ==========================================
  // TEST IDENTIFIERS
  // ==========================================

  const applicationId = buildTestId();

  // ==========================================
  // TEST USERS
  // ==========================================

  const users = {
    sales: buildTestUser({ role: Role.SALES }),
    reviewer: buildTestUser({ role: Role.REVIEWER }),
    admin: buildTestUser({ role: Role.ADMIN }),
  };

  let currentUser: TestUser = users.sales;

  // ==========================================
  // VALID CREATE APPLICATION DTO
  // ==========================================

  const createApplicationDto = buildCreateApplicationDto();

  // ==========================================
  // APPLICATION FACTORY
  // ==========================================

  const buildApplication = (
    overrides: Partial<TestApplication> = {},
  ): TestApplication =>
    buildTestApplication({
      id: applicationId,
      ...createApplicationDto,
      createdById: users.sales.id,
      ...overrides,
    });

  let storedApplication = buildApplication();

  // ==========================================
  // MOCK QUERY BUILDER
  // ==========================================

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

  // ==========================================
  // MOCK APPLICATION REPOSITORY
  // ==========================================

  const mockApplicationRepository = {
    create: jest.fn<(...args: any[]) => any>(),

    save: jest.fn<(...args: any[]) => Promise<any>>(),

    merge: jest.fn<(...args: any[]) => any>(),

    findOne: jest.fn<(...args: any[]) => Promise<any>>(),

    createQueryBuilder: jest.fn<(...args: any[]) => any>(),
  };

  // ==========================================
  // MOCK USER REPOSITORY
  // ==========================================

  const mockUserRepository = {
    findOne: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  // ==========================================
  // MOCK RISK QUEUE
  // ==========================================

  const mockRiskQueue = {
    add: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  // ==========================================
  // MOCK AUDIT SERVICE
  // ==========================================

  const mockAuditService = {
    logAction: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  // ==========================================
  // TEST JWT AUTH GUARD
  // ==========================================

  class TestJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();

      req.user = currentUser;

      return true;
    }
  }

  // ==========================================
  // TEST APPLICATION INITIALIZATION
  // ==========================================

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

  // ==========================================
  // RESET MOCKS BEFORE EACH TEST
  // ==========================================

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
      id: users.reviewer.id,
      role: Role.REVIEWER,
    });

    mockRiskQueue.add.mockResolvedValue({
      id: `risk-${applicationId}-1`,

      getState: jest.fn(async () => 'waiting'),
    });

    mockAuditService.logAction.mockResolvedValue(undefined);
  });

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // HELPER: ASSERT HTTP RESPONSE
  // ==========================================

  const assertStatus = (
    response: {
      status: number;
      body: any;
    },
    expectedStatus: number,
  ) => {
    if (response.status !== expectedStatus) {
      console.error(
        'Unexpected HTTP response:',
        JSON.stringify(
          {
            expectedStatus,

            actualStatus: response.status,

            body: response.body,
          },
          null,
          2,
        ),
      );
    }

    expect(response.status).toBe(expectedStatus);
  };

  // ==========================================
  // CREATE APPLICATION
  // ==========================================

  describe('POST /applications', () => {
    it('should create a draft application as SALES', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto);

      assertStatus(response, 201);

      expect(response.body.status).toBe(
        ApplicationStatus.DRAFT,
      );

      expect(response.body.createdById).toBe(users.sales.id);

      expect(
        mockApplicationRepository.save,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockAuditService.logAction,
      ).toHaveBeenCalledWith(
        'CREATE_APPLICATION',

        'MerchantApplication',

        applicationId,

        users.sales.id,

        expect.any(Object),
      );
    });

    it('should allow ADMIN to create an application', async () => {
      currentUser = users.admin;

      const response = await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto);

      assertStatus(response, 201);

      expect(response.body.status).toBe(
        ApplicationStatus.DRAFT,
      );

      expect(response.body.createdById).toBe(users.admin.id);

      expect(
        mockApplicationRepository.save,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject REVIEWER from creating an application', async () => {
      currentUser = users.reviewer;

      const response = await request(app.getHttpServer())
        .post('/applications')
        .send(createApplicationDto);

      assertStatus(response, 403);

      expect(
        mockApplicationRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // CREATE APPLICATION VALIDATION
  // ==========================================

  describe('POST /applications - validation', () => {
    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          businessName: createApplicationDto.businessName,
        });

      assertStatus(response, 400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('legalBusinessName'),

          expect.stringContaining('businessType'),

          expect.stringContaining('ownerName'),

          expect.stringContaining('contactEmail'),

          expect.stringContaining('estimatedMonthlyVolume'),
        ]),
      );
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          contactEmail: 'invalid-email',
        });

      assertStatus(response, 400);
    });

    it('should reject negative monthly volume', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          estimatedMonthlyVolume: -100,
        });

      assertStatus(response, 400);
    });

    it('should reject more than two decimal places', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          estimatedMonthlyVolume: 100.123,
        });

      assertStatus(response, 400);
    });

    it('should reject unknown properties', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          registrationNumber: 'REG-123456',
        });

      assertStatus(response, 400);
    });

    it('should reject business name longer than 200 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          businessName: 'A'.repeat(201),
        });

      assertStatus(response, 400);
    });

    it('should allow optional contactPhone to be omitted', async () => {
      const {
        contactPhone,
        ...payload
      } = createApplicationDto;

      const response = await request(app.getHttpServer())
        .post('/applications')
        .send(payload);

      assertStatus(response, 201);
    });

    it('should reject monthly volume above maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/applications')
        .send({
          ...createApplicationDto,

          estimatedMonthlyVolume: 10000000000000,
        });

      assertStatus(response, 400);
    });
  });

  // ==========================================
  // LIST APPLICATIONS
  // ==========================================

  describe('GET /applications', () => {
    it('should list applications with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/applications?page=1&limit=10');

      assertStatus(response, 200);

      expect(response.body.total).toBe(1);

      expect(response.body.items).toHaveLength(1);
    });

    it('should restrict SALES list to their applications', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .get('/applications?page=1&limit=10');

      assertStatus(response, 200);

      expect(
        mockQueryBuilder.andWhere,
      ).toHaveBeenCalledWith(
        'app.createdById = :userId',

        {
          userId: users.sales.id,
        },
      );
    });

    it('should filter applications by status', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/applications?page=1&limit=10&status=${ApplicationStatus.DRAFT}`,
        );

      assertStatus(response, 200);

      expect(
        mockQueryBuilder.andWhere,
      ).toHaveBeenCalledWith(
        'app.status = :status',

        {
          status: ApplicationStatus.DRAFT,
        },
      );
    });

    it('should reject invalid page number', async () => {
      const response = await request(app.getHttpServer())
        .get('/applications?page=0&limit=10');

      assertStatus(response, 400);
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/applications?page=1&limit=101');

      assertStatus(response, 400);
    });

    it('should reject invalid status', async () => {
      const response = await request(app.getHttpServer())
        .get('/applications?status=INVALID_STATUS');

      assertStatus(response, 400);
    });
  });

  // ==========================================
  // GET APPLICATION BY ID
  // ==========================================

  describe('GET /applications/:id', () => {
    it('should allow ADMIN to view an application', async () => {
      currentUser = users.admin;

      const response = await request(app.getHttpServer())
        .get(`/applications/${applicationId}`);

      assertStatus(response, 200);

      expect(response.body.id).toBe(applicationId);
    });

    it('should allow SALES to view their own application', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .get(`/applications/${applicationId}`);

      assertStatus(response, 200);

      expect(response.body.id).toBe(applicationId);
    });

    it('should reject access to nonexistent applications', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/applications/${applicationId}`);

      assertStatus(response, 404);
    });
  });

  // ==========================================
  // UPDATE APPLICATION
  // ==========================================

  describe('PATCH /applications/:id', () => {
    it('should update an application with correct version', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 200);

      expect(
        mockQueryBuilder.execute,
      ).toHaveBeenCalledTimes(1);

      expect(response.body.id).toBe(applicationId);
    });

    it('should return 409 on optimistic locking conflict', async () => {
      mockQueryBuilder.execute.mockResolvedValue({
        affected: 0,
      });

      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 409);
    });

    it('should reject invalid version', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=0`)
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 400);
    });

    it('should reject missing version', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}`)
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 400);
    });

    it('should reject invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/applications/invalid-uuid?version=1')
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 400);
    });

    it('should reject REVIEWER from updating applications', async () => {
      currentUser = users.reviewer;

      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          businessName: 'Updated Trading',
        });

      assertStatus(response, 403);
    });

    it('should reject invalid update payload', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}?version=1`)
        .send({
          contactEmail: 'invalid-email',
        });

      assertStatus(response, 400);
    });
  });

  // ==========================================
  // SUBMIT APPLICATION
  // ==========================================

  describe('POST /applications/:id/submit', () => {
    it('should submit application and enqueue risk review', async () => {
      currentUser = users.sales;

      storedApplication = buildApplication({
        status: ApplicationStatus.DRAFT,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`);

      assertStatus(response, 201);

      expect(response.body.status).toBe(
        ApplicationStatus.SUBMITTED,
      );

      expect(response.body.riskStatus).toBe(
        RiskStatus.PENDING,
      );

      expect(
        mockRiskQueue.add,
      ).toHaveBeenCalledWith(
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

      expect(
        mockAuditService.logAction,
      ).toHaveBeenCalledWith(
        'SUBMIT_APPLICATION',

        'MerchantApplication',

        applicationId,

        users.sales.id,

        expect.any(Object),
      );
    });

    it('should reject submitting an already submitted application', async () => {
      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`);

      assertStatus(response, 400);
    });

    it('should reject REVIEWER from submitting', async () => {
      currentUser = users.reviewer;

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/submit`);

      assertStatus(response, 403);
    });
  });

  // ==========================================
  // ASSIGN REVIEWER
  // ==========================================

  describe('POST /applications/:id/assign', () => {
    it('should allow ADMIN to assign a reviewer', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId: users.reviewer.id,
        });

      assertStatus(response, 201);

      expect(response.body.assignedReviewerId).toBe(
        users.reviewer.id,
      );

      expect(response.body.status).toBe(
        ApplicationStatus.UNDER_REVIEW,
      );

      expect(
        mockAuditService.logAction,
      ).toHaveBeenCalledWith(
        'ASSIGN_REVIEWER',

        'MerchantApplication',

        applicationId,

        users.admin.id,

        expect.any(Object),
      );
    });

    it('should reject invalid reviewer', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.SUBMITTED,
      });

      mockUserRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId: users.reviewer.id,
        });

      assertStatus(response, 400);
    });

    it('should reject invalid reviewer UUID', async () => {
      currentUser = users.admin;

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId: 'invalid-uuid',
        });

      assertStatus(response, 400);
    });

    it('should reject duplicate reviewer assignment', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,

        assignedReviewerId: users.reviewer.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId: users.reviewer.id,
        });

      assertStatus(response, 409);
    });

    it('should reject SALES from assigning reviewers', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/assign`)
        .send({
          reviewerId: users.reviewer.id,
        });

      assertStatus(response, 403);
    });
  });

  // ==========================================
  // REVIEW DECISION
  // ==========================================

  describe('POST /applications/:id/decision', () => {
    it('should allow REVIEWER to approve application', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,

        assignedReviewerId: users.reviewer.id,

        riskStatus: RiskStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        });

      assertStatus(response, 201);

      expect(response.body.status).toBe(
        ApplicationStatus.APPROVED,
      );

      expect(
        mockAuditService.logAction,
      ).toHaveBeenCalledWith(
        'RECORD_DECISION',

        'MerchantApplication',

        applicationId,

        users.reviewer.id,

        expect.any(Object),
      );
    });

    it('should reject invalid decision value', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,

        assignedReviewerId: users.reviewer.id,

        riskStatus: RiskStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: 'INVALID_DECISION',
        });

      assertStatus(response, 400);
    });

    it('should reject notes longer than 1000 characters', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,

        assignedReviewerId: users.reviewer.id,

        riskStatus: RiskStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,

          notes: 'A'.repeat(1001),
        });

      assertStatus(response, 400);
    });

    it('should reject decision while risk review is pending', async () => {
      currentUser = users.reviewer;

      storedApplication = buildApplication({
        status: ApplicationStatus.UNDER_REVIEW,

        assignedReviewerId: users.reviewer.id,

        riskStatus: RiskStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        });

      assertStatus(response, 400);
    });

    it('should reject decision when not under review', async () => {
      currentUser = users.admin;

      storedApplication = buildApplication({
        status: ApplicationStatus.DRAFT,

        riskStatus: RiskStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        });

      assertStatus(response, 400);
    });

    it('should reject SALES from recording decisions', async () => {
      currentUser = users.sales;

      const response = await request(app.getHttpServer())
        .post(`/applications/${applicationId}/decision`)
        .send({
          decision: ApplicationStatus.APPROVED,
        });

      assertStatus(response, 403);
    });
  });
});