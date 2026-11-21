import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import {
  AutoReviewPromotionCandidateEvidence,
  AutoReviewPromotionCandidateImpact,
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateRisk,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionRollbackPlan,
  AutoReviewPromotionStatus,
} from '../interfaces';

@Index(['owner', 'candidateVersion'], { unique: true })
@Entity({ name: 'bk_tb_feedback_auto_review_promotion_candidate' })
export class FeedbackAutoReviewPromotionCandidateEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  owner: string;

  @Column({
    type: 'enum',
    enum: AutoReviewPromotionCandidateType,
  })
  type: AutoReviewPromotionCandidateType;

  @Column({
    type: 'enum',
    enum: AutoReviewPromotionStatus,
  })
  status: AutoReviewPromotionStatus;

  @Column({
    type: 'enum',
    enum: AutoReviewPromotionCandidateOrigin,
  })
  origin: AutoReviewPromotionCandidateOrigin;

  @Column({ type: 'varchar', length: 64 })
  candidateVersion: string;

  @Column({ type: 'varchar', length: 64 })
  baseReviewVersion: string;

  @Column({ type: 'json' })
  evidence: AutoReviewPromotionCandidateEvidence;

  @Column({ type: 'json' })
  expectedImpact: AutoReviewPromotionCandidateImpact;

  @Column({ type: 'json' })
  knownRisk: AutoReviewPromotionCandidateRisk;

  @Column({ type: 'json' })
  rollbackPlan: AutoReviewPromotionRollbackPlan;

  @Column({ type: 'varchar', length: 64 })
  createdBy: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  approvedBy?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rejectedBy?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  appliedBy?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rolledBackBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: string | null;

  @Column({ type: 'datetime', nullable: true })
  rejectedAt?: string | null;

  @Column({ type: 'datetime', nullable: true })
  appliedAt?: string | null;

  @Column({ type: 'datetime', nullable: true })
  rolledBackAt?: string | null;

  @Column({ type: 'text', nullable: true })
  rollbackReason?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
