import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ApplicationsController } from '@modules/applications/applications.controller';
import { ApplicationsService } from '@modules/applications/applications.service';
import { MerchantApplicationEntity } from '@modules/applications/entities/merchant-application.entity';
import { AuditModule } from '@modules/audit/audit.module';
import { User } from '@modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantApplicationEntity, User]), BullModule.registerQueue({ name: 'risk-review' }),AuditModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}