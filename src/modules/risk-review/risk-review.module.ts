import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskReviewProcessor } from '@modules/risk-review/risk-review.processor';
import { MerchantApplication } from '@modules/applications/entities/merchant-application.entity';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantApplication]),AuditModule],
  providers: [RiskReviewProcessor],
})
export class RiskReviewModule {}