import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';

import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MerchantApplicationEntity } from '@modules/applications/entities/merchant-application.entity';

import { RiskStatus } from '@core/enums/risk-status.enum';
import { AuditService } from '@modules/audit/audit.service';

interface RiskReviewJobData {
  id: string;
  version?: number;
}

@Processor('risk-review')
@Injectable()
export class RiskReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskReviewProcessor.name);

  constructor(
    @InjectRepository(MerchantApplicationEntity)
    private readonly repo: Repository<MerchantApplicationEntity>,

    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<RiskReviewJobData>): Promise<void> {
    const { id } = job.data;

    this.logger.log(`[START] Risk review job=${job.id}, application=${id}`);

    const app = await this.repo.findOneBy({ id });

    if (!app) {
      this.logger.warn(`[SKIPPED] Application ${id} not found`);
      return;
    }

    this.logger.log(
      `[STATE] Application=${app.status}, Risk=${app.riskStatus}`,
    );

    // Already completed: skip duplicate processing.
    if (app.riskStatus === RiskStatus.COMPLETED) {
      this.logger.log(`[SKIPPED] Application ${id} already evaluated`);
      return;
    }

    // Only pending evaluations or retrying processing attempts.
    if (![RiskStatus.PENDING, RiskStatus.PROCESSING].includes(app.riskStatus)) {
      this.logger.warn(`[SKIPPED] Invalid risk status: ${app.riskStatus}`);
      return;
    }

    try {
      // Set PROCESSING before calling the external provider.
      if (app.riskStatus === RiskStatus.PENDING) {
        app.riskStatus = RiskStatus.PROCESSING;
        await this.repo.save(app);
      }

      this.logger.log(`[KYB] Starting evaluation for ${id}`);

      const score = await this.simulateThirdPartyRiskApi(
        app.estimatedMonthlyVolume,
      );

      const riskLevel = score >= 80 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

      this.logger.log(`[KYB] Completed: score=${score}, level=${riskLevel}`);

      // A successful provider response always means COMPLETED.
      app.riskStatus = RiskStatus.COMPLETED;

      const saved = await this.repo.save(app);

      await this.auditService.logAction(
        'RISK_EVALUATION',
        'MerchantApplication',
        saved.id,
        'SYSTEM',
        {
          score,
          riskLevel,
          riskStatus: RiskStatus.COMPLETED,
          jobId: job.id,
        },
      );

      this.logger.log(`[SUCCESS] Application ${id} risk review completed`);
    } catch (error) {
      this.logger.error(
        `[ERROR] Application ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      // BullMQ handles retry according to attempts/backoff.
      throw error;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[WORKER ACTIVE] Job ${job.id}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`[WORKER COMPLETED] Job ${job.id}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job) return;

    this.logger.error(`[WORKER FAILED] Job ${job.id}: ${error.message}`);

    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `[RETRY] Job ${job.id}, attempt ${job.attemptsMade}/${maxAttempts}`,
      );
      return;
    }

    // All attempts exhausted.
    const { id } = job.data as RiskReviewJobData;

    const result = await this.repo
      .createQueryBuilder()
      .update(MerchantApplicationEntity)
      .set({
        riskStatus: RiskStatus.FAILED,
      })
      .where('id = :id', { id })
      .andWhere('riskStatus = :status', {
        status: RiskStatus.PROCESSING,
      })
      .execute();

    if (result.affected === 1) {
      this.logger.error(`[FINAL FAILURE] Risk review failed for ${id}`);
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[WORKER STALLED] Job ${jobId}`);
  }

  private async simulateThirdPartyRiskApi(volume: number): Promise<number> {
    this.logger.debug(`[KYB API] Estimated monthly volume: ${volume}`);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate a temporary third-party service failure.
        if (Math.random() < 0.2) {
          return reject(new Error('Third-party KYB API timeout'));
        }

        const score = Math.floor(Math.random() * 101);

        resolve(score);
      }, 1500);
    });
  }
}
