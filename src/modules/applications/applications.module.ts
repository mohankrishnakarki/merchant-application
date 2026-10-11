import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ApplicationsController } from '@modules/applications/applications.controller';
import { ApplicationsService } from '@modules/applications/applications.service';
import { MerchantApplication } from '@modules/applications/entities/merchant-application.entity';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantApplication]), BullModule.registerQueue({ name: 'risk-review' }),AuditModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}