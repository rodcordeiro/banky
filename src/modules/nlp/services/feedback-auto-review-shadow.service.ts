import { ENV_VARIABLES } from '@/common/config/env.config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import {
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewResult,
  AutoReviewReportFilters,
  AutoReviewReportResult,
  AutoReviewReportItem,
  AutoReviewReasonSeverity,
  AutoReviewRevaluationResult,
  AUTO_REVIEW_THRESHOLDS,
  FeedbackStatus,
} from '../interfaces';
import { NlpService } from './nlp.service';

const PROD_SHADOW_CRON = '0 */15 * * * *';
const DEV_SHADOW_CRON = '0 */1 * * * *';
const DEFAULT_SHADOW_BATCH_SIZE = 100;
export const DEFAULT_SHADOW_REVIEW_VERSION = 'auto-review-shadow-v1';

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
    const result = await this.revaluatePendingBatch();
    return result.evaluated;
  }

  /**
   * Reavalia feedbacks pending em modo shadow, de forma idempotente por versao.
   * Nao altera status/corrected* e nao aplica approve/correct.
   */
  async revaluatePendingBatch(options?: {
    reviewVersion?: string;
    batchSize?: number;
    owner?: string;
  }): Promise<AutoReviewRevaluationResult> {
    const reviewVersion =
      options?.reviewVersion?.trim() || DEFAULT_SHADOW_REVIEW_VERSION;
    const batchSize =
      Number.isFinite(options?.batchSize) && (options?.batchSize as number) > 0
        ? Math.floor(options?.batchSize as number)
        : DEFAULT_SHADOW_BATCH_SIZE;
    const startedAt = new Date().toISOString();

    this._logger.log(
      `Starting shadow revaluation batch version=${reviewVersion} batchSize=${batchSize}`,
    );

    const pendingFeedbacks = await this._feedbackRepository.find({
      where: {
        status: FeedbackStatus.pending,
        ...(options?.owner ? { owner: options.owner } : {}),
      },
      order: {
        createdAt: 'ASC',
      },
      take: batchSize,
    });

    let evaluated = 0;
    let skipped = 0;
    let errors = 0;
    const errorFeedbackIds: string[] = [];

    for (const feedback of pendingFeedbacks) {
      try {
        if (feedback.status !== FeedbackStatus.pending) {
          skipped += 1;
          continue;
        }

        const saved = await this.evaluateAndPersist(feedback, reviewVersion);
        if (saved) {
          evaluated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        errors += 1;
        errorFeedbackIds.push(feedback.id);
        this._logger.error(
          `Failed to revaluate shadow review for feedback ${feedback.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    const finishedAt = new Date().toISOString();
    const result: AutoReviewRevaluationResult = {
      startedAt,
      finishedAt,
      reviewVersion,
      mode: AutoReviewMode.shadow,
      batchSize,
      candidates: pendingFeedbacks.length,
      evaluated,
      skipped,
      errors,
      errorFeedbackIds,
    };

    this._logger.log(
      `Finished shadow revaluation version=${reviewVersion} candidates=${result.candidates} evaluated=${evaluated} skipped=${skipped} errors=${errors}`,
    );

    return result;
  }

  async evaluateAndPersist(
    feedback: FeedbackEntity,
    reviewVersion = DEFAULT_SHADOW_REVIEW_VERSION,
  ): Promise<FeedbackAutoReviewEntity | null> {
    const existing = await this._feedbackAutoReviewRepository.findOne({
      where: {
        feedbackId: feedback.id,
        mode: AutoReviewMode.shadow,
        reviewVersion,
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
        reviewVersion,
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

  async applyAutoReviewDecision(
    feedback: FeedbackEntity,
    evaluation: AutoReviewResult,
  ): Promise<FeedbackEntity | null> {
    if (
      evaluation.mode === AutoReviewMode.automatic &&
      evaluation.decision === AutoReviewDecision.approve &&
      this.hasHumanCorrections(feedback)
    ) {
      await this._nlpService.persistBlockedAutoReview(feedback, evaluation);
      return null;
    }

    if (!this.canApplyAutoReviewDecision(feedback, evaluation)) {
      return null;
    }

    const existing = await this._feedbackAutoReviewRepository.findOne({
      where: {
        feedbackId: feedback.id,
        mode: AutoReviewMode.automatic,
        reviewVersion: evaluation.reviewVersion,
      },
    });

    if (existing?.applied) {
      return null;
    }

    const appliedAt = new Date().toISOString();
    const savedFeedback = await this._feedbackRepository.save({
      ...feedback,
      status: FeedbackStatus.validated,
    });

    const history = existing
      ? this._feedbackAutoReviewRepository.merge(existing, {
          owner: feedback.owner,
          mode: AutoReviewMode.automatic,
          decision: AutoReviewDecision.approve,
          score: evaluation.score,
          fieldScores: evaluation.fieldScores,
          reasons: evaluation.reasons,
          suggestedCorrections: evaluation.suggestedCorrections ?? null,
          reviewVersion: evaluation.reviewVersion,
          evaluatedAt: evaluation.evaluatedAt,
          applied: true,
          appliedAt,
        })
      : this._feedbackAutoReviewRepository.create({
          feedbackId: feedback.id,
          owner: feedback.owner,
          mode: AutoReviewMode.automatic,
          decision: AutoReviewDecision.approve,
          score: evaluation.score,
          fieldScores: evaluation.fieldScores,
          reasons: evaluation.reasons,
          suggestedCorrections: evaluation.suggestedCorrections ?? null,
          reviewVersion: evaluation.reviewVersion,
          evaluatedAt: evaluation.evaluatedAt,
          applied: true,
          appliedAt,
        });

    const savedHistory = await this._feedbackAutoReviewRepository.save(history);

    return savedHistory.applied ? savedFeedback : null;
  }

  async buildOperationalReport(
    owner: string,
    filters: AutoReviewReportFilters = {},
  ): Promise<AutoReviewReportResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const baseQuery = this.buildReportQuery(owner, filters);
    const dataQuery = baseQuery.clone();

    const [rows, total] = await Promise.all([
      dataQuery
        .skip(limit * (page - 1))
        .take(limit)
        .getRawMany(),
      baseQuery.getCount(),
    ]);

    const items = rows.map(row => this.mapReportRow(row));
    const totalPages = Math.ceil(total / limit) || undefined;

    return {
      items,
      meta: {
        currentPage: page,
        itemCount: items.length,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNext: page < (totalPages ?? 1),
      },
    };
  }

  private buildReportQuery(
    owner: string,
    filters: AutoReviewReportFilters,
  ): SelectQueryBuilder<FeedbackAutoReviewEntity> {
    const query = this._feedbackAutoReviewRepository
      .createQueryBuilder('autoReview')
      .innerJoin(
        FeedbackEntity,
        'feedback',
        'feedback.id = autoReview.feedbackId',
      )
      .select('autoReview.feedbackId', 'feedbackId')
      .addSelect('feedback.originalText', 'originalText')
      .addSelect('feedback.status', 'humanStatus')
      .addSelect('autoReview.mode', 'mode')
      .addSelect('autoReview.decision', 'decision')
      .addSelect('autoReview.score', 'score')
      .addSelect('autoReview.reasons', 'reasons')
      .addSelect('autoReview.reviewVersion', 'reviewVersion')
      .addSelect('autoReview.evaluatedAt', 'evaluatedAt')
      .addSelect('autoReview.createdAt', 'createdAt')
      .where('autoReview.owner = :owner', { owner });

    if (filters.mode) {
      query.andWhere('autoReview.mode = :mode', { mode: filters.mode });
    }

    if (filters.decision) {
      query.andWhere('autoReview.decision = :decision', {
        decision: filters.decision,
      });
    }

    if (filters.minScore !== undefined) {
      query.andWhere('autoReview.score >= :minScore', {
        minScore: filters.minScore,
      });
    }

    if (filters.maxScore !== undefined) {
      query.andWhere('autoReview.score <= :maxScore', {
        maxScore: filters.maxScore,
      });
    }

    if (filters.from) {
      query.andWhere('autoReview.evaluatedAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('autoReview.evaluatedAt <= :to', { to: filters.to });
    }

    const divergenceExpression = this.buildDivergenceExpression();
    query.addSelect(divergenceExpression, 'divergent');

    if (filters.divergence !== undefined) {
      query.andWhere(`${divergenceExpression} = :divergence`, {
        divergence: filters.divergence ? 1 : 0,
      });
    }

    const sortBy = filters.sortBy ?? 'createdAt';
    const order = filters.order ?? 'DESC';

    if (sortBy === 'divergence') {
      query.orderBy('divergent', order);
    } else if (sortBy === 'score') {
      query.orderBy('autoReview.score', order);
    } else {
      query.orderBy('autoReview.createdAt', order);
    }

    return query;
  }

  private buildDivergenceExpression(): string {
    const approvedStatus =
      AUTO_REVIEW_DECISION_STATUS_MAP[AutoReviewDecision.approve];
    const correctedStatus =
      AUTO_REVIEW_DECISION_STATUS_MAP[AutoReviewDecision.correct];
    const pendingStatus = FeedbackStatus.pending;

    return `CASE
      WHEN (
        (autoReview.decision = '${AutoReviewDecision.approve}' AND feedback.status = '${approvedStatus}')
        OR (autoReview.decision = '${AutoReviewDecision.correct}' AND feedback.status = '${correctedStatus}')
        OR (
          autoReview.decision IN ('${AutoReviewDecision.manualReview}', '${AutoReviewDecision.reject}')
          AND feedback.status = '${pendingStatus}'
        )
      ) THEN 0
      ELSE 1
    END`;
  }

  private canApplyAutoReviewDecision(
    feedback: FeedbackEntity,
    evaluation: AutoReviewResult,
  ): boolean {
    if (evaluation.mode !== AutoReviewMode.automatic) {
      return false;
    }

    if (evaluation.decision !== AutoReviewDecision.approve) {
      return false;
    }

    if (evaluation.score < AUTO_REVIEW_THRESHOLDS.approve) {
      return false;
    }

    if (feedback.status !== FeedbackStatus.pending) {
      return false;
    }

    if (this.hasHumanCorrections(feedback)) {
      return false;
    }

    return !evaluation.reasons.some(
      reason => reason.severity !== AutoReviewReasonSeverity.info,
    );
  }

  private hasHumanCorrections(feedback: FeedbackEntity): boolean {
    return [
      feedback.correctedIntent,
      feedback.correctedAccount,
      feedback.correctedOriginAccount,
      feedback.correctedDestinyAccount,
      feedback.correctedCategory,
      feedback.correctedValue,
      feedback.correctedDate,
    ].some(
      value =>
        value !== undefined && value !== null && String(value).trim() !== '',
    );
  }

  private mapReportRow(row: Record<string, unknown>): AutoReviewReportItem {
    const score = Number(row['score'] ?? 0);
    const divergent = Number(row['divergent'] ?? 0) === 1;
    const reasonsValue = row['reasons'];
    const reasons = this.parseJson<AutoReviewReportItem['reasons']>(
      reasonsValue,
      [],
    );
    const humanStatus = String(
      row['humanStatus'] ?? FeedbackStatus.pending,
    ) as FeedbackStatus;
    const decision = String(row['decision']) as AutoReviewDecision;
    const shadowStatus = AUTO_REVIEW_DECISION_STATUS_MAP[decision];

    return {
      feedbackId: String(row['feedbackId'] ?? ''),
      originalText: String(row['originalText'] ?? ''),
      decision,
      mode: String(row['mode']) as AutoReviewMode,
      score,
      reasons,
      humanStatus,
      shadowStatus,
      divergent,
      reviewVersion: String(row['reviewVersion'] ?? ''),
      evaluatedAt: String(row['evaluatedAt'] ?? ''),
      createdAt: String(row['createdAt'] ?? ''),
    };
  }

  private parseJson<T>(value: unknown, fallback: T): T {
    if (value && typeof value === 'object') {
      return value as T;
    }

    if (typeof value !== 'string') {
      return fallback;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String((error as { message?: unknown })?.message ?? error);
  }
}
