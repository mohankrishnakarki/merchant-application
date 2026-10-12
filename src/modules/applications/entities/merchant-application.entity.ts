import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

import { IMerchantApplication } from '@core/interfaces/merchant-application.interface';

import { ApplicationStatus } from '@core/enums/application-status.enum';
import { RiskStatus } from '@core/enums/risk-status.enum';

@Entity('merchant_applications')
@Index(['createdById', 'status'])
@Index(['assignedReviewerId', 'status'])
export class MerchantApplicationEntity
  implements IMerchantApplication
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  businessName: string;

  @Column({ type: 'varchar', length: 200 })
  legalBusinessName: string;

  @Column({ type: 'varchar', length: 100 })
  businessType: string;

  @Column({ type: 'varchar', length: 150 })
  ownerName: string;

  @Column({ type: 'varchar', length: 255 })
  contactEmail: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  contactPhone?: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  estimatedMonthlyVolume: number;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  status: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: RiskStatus,
    default: RiskStatus.NOT_STARTED,
  })
  riskStatus: RiskStatus;

  @Column({
    type: 'uuid',
    name: 'created_by_id',
  })
  createdById: string;

  @Column({
    type: 'uuid',
    name: 'assigned_reviewer_id',
    nullable: true,
  })
  assignedReviewerId: string | null;

  @VersionColumn()
  version: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  submittedAt: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}