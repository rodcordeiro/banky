import { ENV_VARIABLES } from '@/common/config/env.config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackStatus, AutoReviewMode } from '../interfaces';
import { NlpService } from './nlp.service';

const PROD_SHADOW_CRON = '0 */15 * * * *';
const DEV_SHADOW_CRON = '0 */1 * * * *';
const DEFAULT_SHADOW_BATCH_SIZE = 50;
const DEFAULT_SHADOW_REVIEW_VERSION = 'auto-review-shadow-v1';

@Injectable()
export class FeedbackAutoReviewShadowService {
  private readonly _logger = new Logger(FeedbackAutoReviewShadowService.name);

  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _feedbackRepository: Repository<FeedbackEntity>,
    @Inject('FEEDBACK_AUTO_REVIEW_REPOSITORY')
    private readonly _feedbackAutoReviewRepository: Repository<FeedbackAutoReviewEntity>,
    private readonly _nlpService: NlpService,
  ) {}

  @Cron(
    ENV_VARIABLES.NODE_ENV === 'production'
      ? PROD_SHADOW_CRON
      : DEV_SHADOW_CRON,
    { waitForCompletion: true },
  )
  async processShadowBatch(): Promise<number> {
    const pendingFeedbacks = await this._feedbackRepository.find({
      where: {
        status: FeedbackStatus.pending,
      },
      order: {
        createdAt: 'ASC',
      },
      take: DEFAULT_SHADOW_BATCH_SIZE,
    });

    let processed = 0;

    for (const feedback of pendingFeedbacks) {
      try {
        const saved = await this.evaluateAndPersist(feedback);
        if (saved) {
          processed += 1;
        }
      } catch (error) {
        this._logger.error(
          `Failed to process shadow review for feedback ${feedback.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    if (processed > 0) {
      this._logger.log(`Processed ${processed} feedbacks in shadow mode.`);
    }

    return processed;
  }

  async evaluateAndPersist(
    feedback: FeedbackEntity,
  ): Promise<FeedbackAutoReviewEntity | null> {
    const existing = await this._feedbackAutoReviewRepository.findOne({
      where: {
        feedbackId: feedback.id,
        mode: AutoReviewMode.shadow,
        reviewVersion: DEFAULT_SHADOW_REVIEW_VERSION,
      },
    });

    if (existing) {
      return null;
    }

    const evaluation = await this._nlpService.evaluateFeedbackAutoReview(
      feedback,
      feedback.owner,
      {
        mode: AutoReviewMode.shadow,
        reviewVersion: DEFAULT_SHADOW_REVIEW_VERSION,
      },
    );

    const history = this._feedbackAutoReviewRepository.create({
      feedbackId: feedback.id,
      owner: feedback.owner,
      mode: evaluation.mode,
      decision: evaluation.decision,
      score: evaluation.score,
      fieldScores: evaluation.fieldScores,
      reasons: evaluation.reasons,
      suggestedCorrections: evaluation.suggestedCorrections ?? null,
      reviewVersion: evaluation.reviewVersion,
      evaluatedAt: evaluation.evaluatedAt,
    });

    return this._feedbackAutoReviewRepository.save(history);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String((error as { message?: unknown })?.message ?? error);
  }
}
