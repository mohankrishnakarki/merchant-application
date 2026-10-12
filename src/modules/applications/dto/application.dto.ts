import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  IsEmail,
  IsUUID,
  IsIn,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { ApplicationStatus } from '@core/enums/application-status.enum';

import {
  ICreateMerchantApplication,
  IUpdateMerchantApplication,
} from '@core/interfaces/merchant-application.interface';

// ==========================================
// CREATE MERCHANT APPLICATION
// ==========================================

export class CreateApplicationDto implements ICreateMerchantApplication {
  @ApiProperty({
    description: 'Trading or operating name of the merchant business',
    example: 'ABC Restaurant',
    maxLength: 200,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName: string;

  @ApiProperty({
    description: 'Legally registered name of the merchant business',
    example: 'ABC Restaurant Pvt. Ltd.',
    maxLength: 200,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  legalBusinessName: string;

  @ApiProperty({
    description: 'Category or industry in which the merchant operates',
    example: 'RESTAURANT',
    maxLength: 100,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessType: string;

  @ApiProperty({
    description: 'Full name of the merchant business owner',
    example: 'John Doe',
    maxLength: 150,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ownerName: string;

  @ApiProperty({
    description: 'Primary contact email address of the merchant',
    example: 'contact@abcrestaurant.com',
    format: 'email',
    maxLength: 255,
    type: String,
  })
  @IsEmail()
  @MaxLength(255)
  contactEmail: string;

  @ApiPropertyOptional({
    description: 'Primary contact phone number of the merchant',
    example: '+9779841234567',
    maxLength: 30,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiProperty({
    description: 'Estimated monthly transaction volume of the merchant',
    example: 500000.5,
    type: Number,
    minimum: 0,
    maximum: 9999999999999.99,
    multipleOf: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Estimated monthly volume must be a valid number' },
  )
  @Min(0)
  @Max(9999999999999.99)
  estimatedMonthlyVolume: number;
}

// ==========================================
// UPDATE MERCHANT APPLICATION
// ==========================================

export class UpdateApplicationDto
  extends PartialType(CreateApplicationDto)
  implements IUpdateMerchantApplication {}

// ==========================================
// SUBMIT MERCHANT APPLICATION
// ==========================================

export interface ISubmitApplication {
  version: number;
}

export class SubmitApplicationDto implements ISubmitApplication {
  @ApiProperty({
    description:
      'Current version of the merchant application. ' +
      'Used to prevent concurrent or duplicate submissions.',
    example: 1,
    type: Number,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  version: number;
}

// ==========================================
// ASSIGN REVIEWER
// ==========================================

export interface IAssignReviewer {
  reviewerId: string;
}

export class AssignReviewerDto implements IAssignReviewer {
  @ApiProperty({
    description:
      'UUID of the reviewer assigned to evaluate the merchant application. ' +
      'The referenced user must have the REVIEWER role.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    type: String,
  })
  @IsUUID()
  reviewerId: string;
}

// ==========================================
// REVIEW DECISION
// ==========================================

export interface IReviewDecision {
  decision:
    | ApplicationStatus.APPROVED
    | ApplicationStatus.REJECTED
    | ApplicationStatus.NEEDS_INFO;

  notes?: string;
}

export class ReviewDecisionDto implements IReviewDecision {
  @ApiProperty({
    description:
      'Final review decision for the merchant application. ' +
      'APPROVED accepts the application, REJECTED declines it, ' +
      'and NEEDS_INFO requests additional information.',
    enum: [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.NEEDS_INFO,
    ],
    enumName: 'ReviewDecision',
    example: ApplicationStatus.APPROVED,
  })
  @IsIn([
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.NEEDS_INFO,
  ])
  decision:
    | ApplicationStatus.APPROVED
    | ApplicationStatus.REJECTED
    | ApplicationStatus.NEEDS_INFO;

  @ApiPropertyOptional({
    description:
      'Optional reviewer comments explaining the decision. ' +
      'These notes must not contain passwords, access tokens, or secrets.',
    example: 'Business documents verified successfully.',
    maxLength: 1000,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ==========================================
// FILTER APPLICATIONS
// ==========================================

export interface IFilterApplications {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export class FilterApplicationsDto implements IFilterApplications {
  @ApiPropertyOptional({
    description: 'Filter merchant applications by their current status',
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
    example: ApplicationStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Page number for paginated application results',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Maximum number of applications returned per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
