import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReason,
  AutoReviewSuggestedCorrections,
  AutoReviewFieldScores,
} from '../interfaces';

@Index(['feedbackId', 'mode', 'reviewVersion'], { unique: true })
@Entity({ name: 'bk_tb_feedback_auto_review' })
export class FeedbackAutoReviewEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  feedbackId: string;

  @Column({ type: 'varchar', length: 64 })
  owner: string;

  @Column({
    type: 'enum',
    enum: AutoReviewMode,
  })
  mode: AutoReviewMode;

  @Column({
    type: 'enum',
    enum: AutoReviewDecision,
  })
  decision: AutoReviewDecision;

  @Column({
    type: 'double',
  })
  score: number;

  @Column({
    type: 'json',
  })
  fieldScores: AutoReviewFieldScores;

  @Column({
    type: 'json',
  })
  reasons: AutoReviewReason[];

  @Column({
    type: 'json',
    nullable: true,
  })
  suggestedCorrections?: AutoReviewSuggestedCorrections | null;

  @Column({ type: 'varchar', length: 64 })
  reviewVersion: string;

  @Column({
    type: 'datetime',
  })
  evaluatedAt: string;
}
