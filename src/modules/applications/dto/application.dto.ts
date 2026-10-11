import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@core/enums/roles.enum';

export class CreateApplicationDto {
  @IsString() @IsNotEmpty() businessName: string;
  @IsString() @IsNotEmpty() legalBusinessName: string;
  @IsNumber() estimatedMonthlyVolume: number;
}

export class AssignReviewerDto {
  @IsString() @IsNotEmpty() reviewerId: string;
}

export class ReviewDecisionDto {
  @IsEnum([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.INFO_REQUESTED])
  decision: ApplicationStatus;
  
  @IsString() @IsOptional() notes?: string;
}

export class FilterApplicationsDto {
  @IsEnum(ApplicationStatus) @IsOptional() status?: ApplicationStatus;
  
  @IsInt() @Min(1) @IsOptional() @Type(() => Number) page?: number = 1;
  
  @IsInt() @Min(1) @IsOptional() @Type(() => Number) limit?: number = 10;
}