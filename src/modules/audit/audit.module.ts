import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from '@modules/audit/audit.service';
import { AuditLog, AuditLogSchema } from '@modules/audit/schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])
  ],
  providers: [AuditService],
  exports: [AuditService], // <-- This allows other modules to inject AuditService
})
export class AuditModule {}