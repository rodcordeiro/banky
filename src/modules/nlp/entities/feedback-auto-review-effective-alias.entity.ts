import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import { AutoReviewLearningField } from '../interfaces';

export enum EffectiveAliasRuntimeStatus {
  active = 'active',
  inactive = 'inactive',
  paused = 'paused',
}

@Index(['owner', 'field', 'pattern', 'canonicalValue'], { unique: true })
@Index(['owner', 'candidateVersion'])
@Entity({ name: 'bk_tb_feedback_auto_review_effective_alias' })
export class FeedbackAutoReviewEffectiveAliasEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  owner: string;

  @Column({ type: 'varchar', length: 32 })
  field: AutoReviewLearningField | string;

  @Column({ type: 'varchar', length: 128 })
  pattern: string;

  @Column({ type: 'varchar', length: 128 })
  canonicalValue: string;

  @Column({
    type: 'enum',
    enum: EffectiveAliasRuntimeStatus,
    default: EffectiveAliasRuntimeStatus.active,
  })
  runtimeStatus: EffectiveAliasRuntimeStatus;

  @Column({ type: 'varchar', length: 64 })
  candidateVersion: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousVersion?: string | null;

  @Column({ type: 'varchar', length: 64 })
  activatedBy: string;

  @Column({ type: 'datetime' })
  activatedAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  deactivatedBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  deactivatedAt?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  deactivationKind?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
