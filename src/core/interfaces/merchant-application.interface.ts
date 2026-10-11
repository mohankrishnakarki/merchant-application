import { ApplicationStatus, RiskStatus } from '@core/enums/roles.enum';


export interface ICreateMerchantApplication {
  businessName: string;
  legalBusinessName: string;
  estimatedMonthlyVolume: number;
}


export interface IMerchantApplication extends ICreateMerchantApplication {
  id: string;
  status: ApplicationStatus;
  riskStatus: RiskStatus;
  createdById: string;
  assignedReviewerId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}