import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiskReviewProcessor } from
  '@modules/risk-review/risk-review.processor';

import { MerchantApplicationEntity } from
  '@modules/applications/entities/merchant-application.entity';

import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantApplicationEntity,
    ]),

    BullModule.registerQueue({
      name: 'risk-review',
    }),

    AuditModule,
  ],

  providers: [
    RiskReviewProcessor,
  ],
})
export class RiskReviewModule {}