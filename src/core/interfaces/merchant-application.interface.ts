import { ApplicationStatus } from '@core/enums/application-status.enum';
import { RiskStatus } from '@core/enums/risk-status.enum';

export interface ICreateMerchantApplication {
  businessName: string;
  legalBusinessName: string;
  businessType: string;

  ownerName: string;
  contactEmail: string;
  contactPhone?: string;

  estimatedMonthlyVolume: number;
}

export interface IUpdateMerchantApplication
  extends Partial<ICreateMerchantApplication> {
}

export interface IMerchantApplication
  extends ICreateMerchantApplication {
  id: string;

  status: ApplicationStatus;
  riskStatus: RiskStatus;

  createdById: string;
  assignedReviewerId: string | null;

  version: number;

  submittedAt: Date | null;
  reviewedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}