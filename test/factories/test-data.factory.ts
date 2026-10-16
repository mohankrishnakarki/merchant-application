import { randomUUID } from 'node:crypto';

import { ApplicationStatus } from '../../src/core/enums/application-status.enum';
import { RiskStatus } from '../../src/core/enums/risk-status.enum';
import { Role } from '../../src/core/enums/roles.enum';
import { CreateApplicationDto } from '../../src/modules/applications/dto/application.dto';
import { MerchantApplicationEntity } from '../../src/modules/applications/entities/merchant-application.entity';
import { LoginDto } from '../../src/modules/auth/dto/login.dto';
import { CreateUserDto } from '../../src/modules/users/dto/create-user.dto';
import { User } from '../../src/modules/users/entities/user.entity';

let fixtureSequence = 0;

export const buildTestId = (): string => randomUUID();

const nextFixtureNumber = (): number => ++fixtureSequence;

export type TestUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'passwordHash'
  | 'role'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;

export const buildTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const fixtureNumber = nextFixtureNumber();

  return {
    id: buildTestId(),
    email: `test-user-${fixtureNumber}@example.com`,
    passwordHash: 'test-password-hash',
    role: Role.SALES,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
};

export const buildTestCredentials = (
  overrides: Partial<LoginDto> = {},
): LoginDto => {
  const fixtureNumber = nextFixtureNumber();

  return {
    email: `test-login-${fixtureNumber}@example.com`,
    password: 'SecurePassword123!',
    ...overrides,
  };
};

export const buildCreateUserDto = (
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto => {
  const fixtureNumber = nextFixtureNumber();

  return {
    email: `new-user-${fixtureNumber}@example.com`,
    password: 'StrongPassword123!',
    role: Role.SALES,
    ...overrides,
  };
};

export const buildCreateApplicationDto = (
  overrides: Partial<CreateApplicationDto> = {},
): CreateApplicationDto => {
  const fixtureNumber = nextFixtureNumber();

  return {
    businessName: `Test Merchant ${fixtureNumber}`,
    legalBusinessName: `Test Merchant ${fixtureNumber} Limited`,
    businessType: 'RETAIL',
    ownerName: `Test Owner ${fixtureNumber}`,
    contactEmail: `merchant-${fixtureNumber}@example.com`,
    contactPhone: '+15555550100',
    estimatedMonthlyVolume: 500000.5,
    ...overrides,
  };
};

export type TestApplication = CreateApplicationDto &
  Pick<
    MerchantApplicationEntity,
    | 'id'
    | 'createdById'
    | 'assignedReviewerId'
    | 'status'
    | 'riskStatus'
    | 'version'
    | 'submittedAt'
    | 'reviewedAt'
    | 'createdAt'
    | 'updatedAt'
  >;

export const buildTestApplication = (
  overrides: Partial<TestApplication> = {},
): TestApplication => {
  const fixtureNumber = nextFixtureNumber();

  return {
    ...buildCreateApplicationDto(),
    id: buildTestId(),
    createdById: buildTestId(),
    assignedReviewerId: null,
    status: ApplicationStatus.DRAFT,
    riskStatus: RiskStatus.PENDING,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
    businessName:
      overrides.businessName ?? `Test Merchant Application ${fixtureNumber}`,
  };
};
