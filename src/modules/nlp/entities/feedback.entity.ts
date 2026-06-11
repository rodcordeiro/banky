import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column } from 'typeorm';
import { FeedbackStatus } from '../interfaces';

@Entity({ name: 'bk_tb_feedback' })
export class FeedbackEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64, default: 'global' })
  owner: string;

  @Column('text')
  originalText: string;

  @Column('text')
  predictedIntent: string;

  @Column('text', { nullable: true })
  correctedIntent?: string;

  @Column('text', { nullable: true })
  predictedAccount?: string;

  @Column('text', { nullable: true })
  correctedAccount?: string;

  @Column('text', { nullable: true })
  predictedOriginAccount?: string;

  @Column('text', { nullable: true })
  correctedOriginAccount?: string;

  @Column('text', { nullable: true })
  predictedDestinyAccount?: string;

  @Column('text', { nullable: true })
  correctedDestinyAccount?: string;

  @Column('text')
  predictedCategory: string;

  @Column('text', { nullable: true })
  correctedCategory?: string;

  @Column('decimal', { precision: 18, scale: 2 })
  predictedValue: number;

  @Column('decimal', { nullable: true, precision: 18, scale: 2 })
  correctedValue?: number;

  @Column('text')
  predictedDate: string;

  @Column('text', { nullable: true })
  correctedDate?: string;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.pending,
  })
  status: FeedbackStatus = FeedbackStatus.pending;

  @Column({ default: false })
  usedForTraining: boolean;
}
