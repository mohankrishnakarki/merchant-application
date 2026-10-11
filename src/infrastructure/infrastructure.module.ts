import { Module } from '@nestjs/common';
import { PostgresModule } from '@infrastructure/database/postgres/postgres.module';
import { MongoModule } from '@infrastructure/database/mongo/mongo.module';
import { BullMqInfrastructureModule } from '@infrastructure/messaging/bullmq.module';

@Module({
  imports: [
    PostgresModule,
    MongoModule,
    BullMqInfrastructureModule,
  ],
})
export class InfrastructureModule {}