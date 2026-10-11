import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantApplication } from '@modules/applications/entities/merchant-application.entity';
import { RiskStatus } from '@core/enums/roles.enum';
import { AuditService } from '@modules/audit/audit.service';

@Processor('risk-review')
@Injectable()
export class RiskReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskReviewProcessor.name);

  constructor(
    @InjectRepository(MerchantApplication) private repo: Repository<MerchantApplication>,
    private auditService: AuditService,
  ) { super(); }

  async process(job: Job<{ id: string }>) {
    const app = await this.repo.findOne({ where: { id: job.data.id } });
    if (!app) return;

    // Requirement C: Idempotency. Do not re-evaluate if already processed.
    if (app.riskStatus !== RiskStatus.PENDING) {
      this.logger.log(`Job skipped: Application ${app.id} already evaluated.`);
      return;
    }

    try {
      // Requirement C: Simulate 3rd-party KYB network call
      const score = await this.simulateThirdPartyRiskApi(app.estimatedMonthlyVolume);
      
      // Update State
      app.riskStatus = score > 80 ? RiskStatus.FAILED : (score < 30 ? RiskStatus.PASSED : RiskStatus.MANUAL_REVIEW);
      const saved = await this.repo.save(app);

      // Persist Result & Audit
      await this.auditService.logAction('RISK_EVALUATION', 'MerchantApplication', saved.id, 'SYSTEM', { score, result: app.riskStatus });
    } catch (error) {
      // Error bubbles up to BullMQ to trigger retry with exponential backoff
      this.logger.error(`Risk API failed for ${app.id}. Retrying...`);
      throw error; 
    }
  }

  private async simulateThirdPartyRiskApi(volume: number): Promise<number> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Randomly simulate network failure to demonstrate retries
        if (Math.random() < 0.2) return reject(new Error('KYB Timeout'));
        resolve(Math.floor(Math.random() * 100));
      }, 1500);
    });
  }
}