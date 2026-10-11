import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from '@modules/audit/schemas/audit-log.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(@InjectModel(AuditLog.name) private model: Model<AuditLog>) {}

  async logAction(action: string, entityName: string, entityId: string, performedById: string, payload?: any) {
    try {
      // Sensitive fields will be redacted by a utility or pre-save hook before storing in Mongo
      const safePayload = { ...payload };
      if (safePayload.password) delete safePayload.password;
      if (safePayload.taxId) safePayload.taxId = '[REDACTED]';

      await new this.model({ action, entityName, entityId, performedById, payload: safePayload }).save();
    } catch (error) {
      this.logger.error(`Audit log failed: ${action} on ${entityName}`, error);
    }
  }
}