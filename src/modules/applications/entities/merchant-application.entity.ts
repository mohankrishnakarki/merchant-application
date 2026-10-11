import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IMerchantApplication } from '@core/interfaces/merchant-application.interface';
import { ApplicationStatus, RiskStatus } from '@core/enums/roles.enum';

@Entity('merchant_applications')
export class MerchantApplication implements IMerchantApplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() businessName: string;
  @Column() legalBusinessName: string;
  @Column('numeric') estimatedMonthlyVolume: number;
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  status: ApplicationStatus;
  @Column({ type: 'enum', enum: RiskStatus, default: RiskStatus.PENDING })
  riskStatus: RiskStatus;
  @Column() createdById: string;
  @Column({ nullable: true }) assignedReviewerId: string | null;
  @VersionColumn() version: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
