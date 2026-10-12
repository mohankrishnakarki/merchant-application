import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuditLog } from './schemas/audit-log.schema';

import { SensitiveDataUtil } from '@core/utils/sensitive-data.util';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly model: Model<AuditLog>,
  ) {}

  async logAction(
    action: string,
    entityName: string,
    entityId: string,
    performedById: string,
    payload?: unknown,
  ): Promise<void> {
    try {
      const safePayload = SensitiveDataUtil.sanitize(
        payload ?? {},
      );

      await this.model.create({
        action,
        entityName,
        entityId,
        performedById,
        payload: safePayload,
      });
    } catch (error) {
      this.logger.error(
        `Audit log failed: ${action} on ${entityName}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}