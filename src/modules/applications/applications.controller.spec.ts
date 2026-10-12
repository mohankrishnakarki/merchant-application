import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RolesGuard } from '@core/guards/roles.guard';
import { ApplicationAccessGuard } from './guards/application-access.guard';

import { ApplicationStatus } from '@core/enums/application-status.enum';
import { RiskStatus } from '@core/enums/risk-status.enum';
import { Role } from '@core/enums/roles.enum';
import { IUser } from '@core/interfaces/user.interface';

import {
  CreateApplicationDto,
  UpdateApplicationDto,
  AssignReviewerDto,
  ReviewDecisionDto,
  FilterApplicationsDto,
} from './dto/application.dto';

type MockAsyncMethod = (...args: unknown[]) => Promise<unknown>;

describe('ApplicationsController', () => {
  let controller: ApplicationsController;

  // =========================================================
  // Mock Users
  // =========================================================

  const salesUser = {
    id: 'sales-user-123',
    role: Role.SALES,
  } as IUser;

  const adminUser = {
    id: 'admin-user-123',
    role: Role.ADMIN,
  } as IUser;

  const reviewerUser = {
    id: 'reviewer-user-123',
    role: Role.REVIEWER,
  } as IUser;

  // =========================================================
  // Mock Application
  // =========================================================

  const application = {
    id: 'application-123',
    businessName: 'Everest Digital Payments',
    createdById: salesUser.id,
    assignedReviewerId: reviewerUser.id,
    status: ApplicationStatus.DRAFT,
    riskStatus: RiskStatus.NOT_STARTED,
    version: 1,
  };

  // =========================================================
  // Mock ApplicationsService
  // =========================================================

  const mockApplicationsService = {
    create: jest.fn<MockAsyncMethod>(),
    list: jest.fn<MockAsyncMethod>(),
    update: jest.fn<MockAsyncMethod>(),
    submit: jest.fn<MockAsyncMethod>(),
    assignReviewer: jest.fn<MockAsyncMethod>(),
    recordDecision: jest.fn<MockAsyncMethod>(),
  };

  // =========================================================
  // Mock Guards
  // =========================================================

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockApplicationAccessGuard = {
    canActivate: jest.fn(() => true),
  };

  // =========================================================
  // Test Setup
  // =========================================================

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideGuard(ApplicationAccessGuard)
      .useValue(mockApplicationAccessGuard)
      .compile();

    controller = module.get<ApplicationsController>(
      ApplicationsController,
    );
  });

  // =========================================================
  // Controller Initialization
  // =========================================================

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // =========================================================
  // CREATE APPLICATION
  // =========================================================

  describe('create()', () => {
    it('should create a merchant application', async () => {
      const dto = {
        businessName: 'Everest Digital Payments',
      } as CreateApplicationDto;

      const expectedResult = {
        ...application,
      };

      mockApplicationsService.create.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.create(dto, {
        user: salesUser,
      });

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.create,
      ).toHaveBeenCalledWith(
        dto,
        salesUser.id,
      );

      expect(
        mockApplicationsService.create,
      ).toHaveBeenCalledTimes(1);
    });

    it('should pass the admin user ID when an admin creates an application', async () => {
      const dto = {
        businessName: 'Admin Created Business',
      } as CreateApplicationDto;

      mockApplicationsService.create.mockResolvedValue({
        ...application,
        businessName: dto.businessName,
        createdById: adminUser.id,
      });

      await controller.create(dto, {
        user: adminUser,
      });

      expect(
        mockApplicationsService.create,
      ).toHaveBeenCalledWith(
        dto,
        adminUser.id,
      );
    });
  });

  // =========================================================
  // LIST APPLICATIONS
  // =========================================================

  describe('list()', () => {
    it('should retrieve applications with filters', async () => {
      const filter = {
        page: 1,
        limit: 10,
      } as FilterApplicationsDto;

      const expectedResult = {
        data: [application],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockApplicationsService.list.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.list(filter, {
        user: salesUser,
      });

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.list,
      ).toHaveBeenCalledWith(
        filter,
        salesUser,
      );
    });

    it('should pass reviewer context when listing applications', async () => {
      const filter = {} as FilterApplicationsDto;

      mockApplicationsService.list.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.list(filter, {
        user: reviewerUser,
      });

      expect(
        mockApplicationsService.list,
      ).toHaveBeenCalledWith(
        filter,
        reviewerUser,
      );
    });
  });

  // =========================================================
  // GET APPLICATION BY ID
  // =========================================================

  describe('findOne()', () => {
    it('should return application loaded by access guard', () => {
      const result = controller.findOne({
        user: salesUser,
        targetApplication: application,
      });

      expect(result).toEqual(application);
    });

    it('should return the assigned application for reviewer', () => {
      const reviewerApplication = {
        ...application,
        status: ApplicationStatus.UNDER_REVIEW,
      };

      const result = controller.findOne({
        user: reviewerUser,
        targetApplication: reviewerApplication,
      });

      expect(result).toEqual(reviewerApplication);
    });
  });

  // =========================================================
  // UPDATE APPLICATION
  // =========================================================

  describe('update()', () => {
    it('should update an application with valid version', async () => {
      const dto = {
        businessName: 'Everest Payments Updated',
      } as UpdateApplicationDto;

      const expectedResult = {
        ...application,
        ...dto,
        version: 2,
      };

      mockApplicationsService.update.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.update(
        application.id,
        dto,
        1,
        { user: salesUser },
      );

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.update,
      ).toHaveBeenCalledWith(
        application.id,
        dto,
        salesUser,
        1,
      );
    });

    it('should reject version zero', async () => {
      await expect(
        controller.update(
          application.id,
          {} as UpdateApplicationDto,
          0,
          { user: salesUser },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockApplicationsService.update,
      ).not.toHaveBeenCalled();
    });

    it('should reject negative version', async () => {
      await expect(
        controller.update(
          application.id,
          {} as UpdateApplicationDto,
          -1,
          { user: salesUser },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to request an application update', async () => {
      const dto = {
        businessName: 'Updated By Admin',
      } as UpdateApplicationDto;

      mockApplicationsService.update.mockResolvedValue({
        ...application,
        ...dto,
        version: 2,
      });

      await controller.update(
        application.id,
        dto,
        1,
        { user: adminUser },
      );

      expect(
        mockApplicationsService.update,
      ).toHaveBeenCalledWith(
        application.id,
        dto,
        adminUser,
        1,
      );
    });
  });

  // =========================================================
  // SUBMIT APPLICATION
  // =========================================================

  describe('submit()', () => {
    it('should submit an application for risk review', async () => {
      const expectedResult = {
        ...application,
        status: ApplicationStatus.SUBMITTED,
        riskStatus: RiskStatus.PENDING,
        version: 2,
      };

      mockApplicationsService.submit.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.submit({
        user: salesUser,
        targetApplication: application,
      });

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.submit,
      ).toHaveBeenCalledWith(
        application,
        salesUser.id,
      );

      expect(
        mockApplicationsService.submit,
      ).toHaveBeenCalledTimes(1);
    });

    it('should forward admin submission to the service', async () => {
      mockApplicationsService.submit.mockResolvedValue({
        ...application,
        status: ApplicationStatus.SUBMITTED,
      });

      await controller.submit({
        user: adminUser,
        targetApplication: application,
      });

      expect(
        mockApplicationsService.submit,
      ).toHaveBeenCalledWith(
        application,
        adminUser.id,
      );
    });
  });

  // =========================================================
  // ASSIGN REVIEWER
  // =========================================================

  describe('assign()', () => {
    it('should assign a reviewer to an application', async () => {
      const dto = {
        reviewerId: reviewerUser.id,
      } as AssignReviewerDto;

      const expectedResult = {
        ...application,
        assignedReviewerId: reviewerUser.id,
        status: ApplicationStatus.UNDER_REVIEW,
      };

      mockApplicationsService.assignReviewer.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.assign(
        application.id,
        dto,
        {
          user: adminUser,
          targetApplication: application,
        },
      );

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.assignReviewer,
      ).toHaveBeenCalledWith(
        application,
        reviewerUser.id,
        adminUser.id,
      );
    });
  });

  // =========================================================
  // RECORD REVIEW DECISION
  // =========================================================

  describe('decision()', () => {
    it('should approve an application', async () => {
      const dto = {
        decision: ApplicationStatus.APPROVED,
        comment: 'Business verification completed',
      } as ReviewDecisionDto;

      const expectedResult = {
        ...application,
        status: ApplicationStatus.APPROVED,
      };

      mockApplicationsService.recordDecision.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.decision(
        application.id,
        dto,
        {
          user: reviewerUser,
          targetApplication: application,
        },
      );

      expect(result).toEqual(expectedResult);

      expect(
        mockApplicationsService.recordDecision,
      ).toHaveBeenCalledWith(
        application,
        dto,
        reviewerUser.id,
      );
    });

    it('should reject an application', async () => {
      const dto = {
        decision: ApplicationStatus.REJECTED,
        comment: 'Verification unsuccessful',
      } as ReviewDecisionDto;

      mockApplicationsService.recordDecision.mockResolvedValue({
        ...application,
        status: ApplicationStatus.REJECTED,
      });

      const result = await controller.decision(
        application.id,
        dto,
        {
          user: reviewerUser,
          targetApplication: application,
        },
      );

      expect(result.status).toBe(ApplicationStatus.REJECTED);
    });

    it('should request additional information', async () => {
      const dto = {
        decision: ApplicationStatus.NEEDS_INFO,
        comment: 'Additional documents required',
      } as ReviewDecisionDto;

      mockApplicationsService.recordDecision.mockResolvedValue({
        ...application,
        status: ApplicationStatus.NEEDS_INFO,
      });

      const result = await controller.decision(
        application.id,
        dto,
        {
          user: reviewerUser,
          targetApplication: application,
        },
      );

      expect(result.status).toBe(ApplicationStatus.NEEDS_INFO);
    });

    it('should forward admin decision to the service', async () => {
      const dto = {
        decision: ApplicationStatus.APPROVED,
      } as ReviewDecisionDto;

      mockApplicationsService.recordDecision.mockResolvedValue({
        ...application,
        status: ApplicationStatus.APPROVED,
      });

      await controller.decision(
        application.id,
        dto,
        {
          user: adminUser,
          targetApplication: application,
        },
      );

      expect(
        mockApplicationsService.recordDecision,
      ).toHaveBeenCalledWith(
        application,
        dto,
        adminUser.id,
      );
    });
  });
});