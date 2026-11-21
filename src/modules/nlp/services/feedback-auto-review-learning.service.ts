import { Inject, Injectable } from '@nestjs/common';
import { In, Not, Repository } from 'typeorm';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AUTO_REVIEW_PROMOTION_POLICY,
  AutoReviewCategoryConfusionItem,
  AutoReviewDecision,
  AutoReviewLearningDatasetSummary,
  AutoReviewLearningDivergenceExample,
  AutoReviewLearningField,
  AutoReviewLearningFieldMetric,
  AutoReviewLearningLoopResult,
  AutoReviewMode,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionEvidence,
  AutoReviewShadowVersionComparison,
  FeedbackStatus,
} from '../interfaces';

const DATASET_VERSION = 'learning-loop-v1';
const DEFAULT_MAX_EXAMPLES = 20;
const MIN_SAMPLES_FOR_INSPECTION = 5;
const LEARNING_FIELDS: AutoReviewLearningField[] = [
  'intent',
  'account',
  'originAccount',
  'destinyAccount',
  'category',
  'value',
  'date',
];

@Injectable()
export class FeedbackAutoReviewLearningService {
  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _feedbackRepository: Repository<FeedbackEntity>,
    @Inject('FEEDBACK_AUTO_REVIEW_REPOSITORY')
    private readonly _feedbackAutoReviewRepository: Repository<FeedbackAutoReviewEntity>,
  ) {}

  async buildLearningLoopReport(
    owner: string,
    maxExamples = DEFAULT_MAX_EXAMPLES,
  ): Promise<AutoReviewLearningLoopResult> {
    const resolvedMaxExamples = this.resolveMaxExamples(maxExamples);
    const reviewedFeedbacks = await this._feedbackRepository.find({
      where: {
        owner,
        status: Not(FeedbackStatus.pending),
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    const feedbackIds = reviewedFeedbacks.map(feedback => feedback.id);
    const histories = feedbackIds.length
      ? await this._feedbackAutoReviewRepository.find({
          where: {
            owner,
            feedbackId: In(feedbackIds),
          },
        })
      : [];
    const autoAppliedFeedbackIds = new Set(
      histories
        .filter(
          history =>
            history.mode === AutoReviewMode.automatic && history.applied,
        )
        .map(history => history.feedbackId),
    );

    const fieldMetrics = this.buildFieldMetrics(reviewedFeedbacks);
    const trainingEligibleFeedbacks = reviewedFeedbacks.filter(
      feedback => !autoAppliedFeedbackIds.has(feedback.id),
    );
    const shadowVersionComparisons = this.buildShadowVersionComparisons(
      reviewedFeedbacks,
      histories,
    );
    const promotionEvidence = this.buildPromotionEvidence(
      trainingEligibleFeedbacks,
      histories,
      shadowVersionComparisons,
    );
    const promotionReadiness = this.buildPromotionReadiness(promotionEvidence);

    return {
      generatedAt: new Date().toISOString(),
      dataset: this.buildDatasetSummary(
        reviewedFeedbacks,
        trainingEligibleFeedbacks,
        autoAppliedFeedbackIds,
      ),
      fieldMetrics,
      categoryConfusions: this.buildCategoryConfusions(reviewedFeedbacks),
      divergenceExamples: this.buildDivergenceExamples(
        reviewedFeedbacks,
        resolvedMaxExamples,
      ),
      shadowVersionComparisons,
      inspectionReady:
        promotionEvidence.humanReviewedSampleSize >= MIN_SAMPLES_FOR_INSPECTION,
      promotionEvidence,
      promotionReadiness,
    };
  }

  private buildDatasetSummary(
    reviewedFeedbacks: FeedbackEntity[],
    trainingEligibleFeedbacks: FeedbackEntity[],
    autoAppliedFeedbackIds: Set<string>,
  ): AutoReviewLearningDatasetSummary {
    const sampleCounts = LEARNING_FIELDS.reduce(
      (counts, field) => ({
        ...counts,
        [field]: trainingEligibleFeedbacks.filter(feedback =>
          this.hasValue(this.resolveCanonicalValue(feedback, field)),
        ).length,
      }),
      {} as Record<AutoReviewLearningField, number>,
    );

    return {
      version: DATASET_VERSION,
      totalReviewedFeedbacks: reviewedFeedbacks.length,
      humanReviewedFeedbacks:
        reviewedFeedbacks.length - autoAppliedFeedbackIds.size,
      autoAppliedFeedbacks: autoAppliedFeedbackIds.size,
      trainingEligibleFeedbacks: trainingEligibleFeedbacks.length,
      sampleCounts,
    };
  }

  private buildFieldMetrics(
    reviewedFeedbacks: FeedbackEntity[],
  ): AutoReviewLearningFieldMetric[] {
    return LEARNING_FIELDS.map(field => {
      const samples = reviewedFeedbacks
        .map(feedback => ({
          predicted: this.resolvePredictedValue(feedback, field),
          corrected: this.resolveCorrectedValue(feedback, field),
          canonical: this.resolveCanonicalValue(feedback, field),
        }))
        .filter(sample => this.hasValue(sample.canonical));
      const matches = samples.filter(sample =>
        this.sameValue(sample.predicted, sample.canonical),
      ).length;
      const correctedLabels = samples.filter(sample =>
        this.hasValue(sample.corrected),
      ).length;
      const divergences = samples.filter(
        sample =>
          this.hasValue(sample.corrected) &&
          !this.sameValue(sample.predicted, sample.corrected),
      ).length;

      return {
        field,
        total: samples.length,
        matches,
        divergences,
        correctedLabels,
        accuracy: this.ratio(matches, samples.length),
      };
    });
  }

  private buildCategoryConfusions(
    reviewedFeedbacks: FeedbackEntity[],
  ): AutoReviewCategoryConfusionItem[] {
    const grouped = new Map<string, AutoReviewCategoryConfusionItem>();

    for (const feedback of reviewedFeedbacks) {
      const predicted = feedback.predictedCategory;
      const corrected = feedback.correctedCategory;

      if (!this.hasValue(corrected) || this.sameValue(predicted, corrected)) {
        continue;
      }

      const key = `${this.normalize(predicted)}>${this.normalize(corrected)}`;
      const current = grouped.get(key) ?? {
        predicted,
        corrected,
        count: 0,
        examples: [],
      };

      current.count += 1;
      if (current.examples.length < 3) {
        current.examples.push(feedback.originalText);
      }

      grouped.set(key, current);
    }

    return [...grouped.values()].sort(
      (left, right) => right.count - left.count,
    );
  }

  private buildDivergenceExamples(
    reviewedFeedbacks: FeedbackEntity[],
    maxExamples: number,
  ): AutoReviewLearningDivergenceExample[] {
    const examples: AutoReviewLearningDivergenceExample[] = [];

    for (const feedback of reviewedFeedbacks) {
      for (const field of LEARNING_FIELDS) {
        const predicted = this.resolvePredictedValue(feedback, field);
        const corrected = this.resolveCorrectedValue(feedback, field);

        if (!this.hasValue(corrected) || this.sameValue(predicted, corrected)) {
          continue;
        }

        examples.push({
          feedbackId: feedback.id,
          field,
          originalText: feedback.originalText,
          predicted,
          corrected,
          status: feedback.status,
        });

        if (examples.length >= maxExamples) {
          return examples;
        }
      }
    }

    return examples;
  }

  private buildShadowVersionComparisons(
    reviewedFeedbacks: FeedbackEntity[],
    histories: FeedbackAutoReviewEntity[],
  ): AutoReviewShadowVersionComparison[] {
    const feedbackById = new Map(
      reviewedFeedbacks.map(feedback => [feedback.id, feedback]),
    );
    const grouped = new Map<
      string,
      { total: number; matches: number; divergences: number }
    >();

    for (const history of histories) {
      if (history.mode !== AutoReviewMode.shadow) {
        continue;
      }

      const feedback = feedbackById.get(history.feedbackId);
      if (!feedback) {
        continue;
      }

      const expectedStatus = AUTO_REVIEW_DECISION_STATUS_MAP[history.decision];
      const current = grouped.get(history.reviewVersion) ?? {
        total: 0,
        matches: 0,
        divergences: 0,
      };

      current.total += 1;
      if (expectedStatus === feedback.status) {
        current.matches += 1;
      } else {
        current.divergences += 1;
      }

      grouped.set(history.reviewVersion, current);
    }

    return [...grouped.entries()]
      .map(([reviewVersion, stats]) => ({
        reviewVersion,
        ...stats,
        agreementRate: this.ratio(stats.matches, stats.total),
      }))
      .sort((left, right) => right.total - left.total);
  }

  private buildPromotionEvidence(
    trainingEligibleFeedbacks: FeedbackEntity[],
    histories: FeedbackAutoReviewEntity[],
    shadowVersionComparisons: AutoReviewShadowVersionComparison[],
  ): AutoReviewPromotionEvidence {
    const criteriaApplied =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ];
    const feedbackById = new Map(
      trainingEligibleFeedbacks.map(feedback => [feedback.id, feedback]),
    );
    const shadowHistories = histories.filter(
      history =>
        history.mode === AutoReviewMode.shadow &&
        feedbackById.has(history.feedbackId),
    );
    const uniqueShadowFeedbackIds = [
      ...new Set(shadowHistories.map(history => history.feedbackId)),
    ];
    const sampleSize = uniqueShadowFeedbackIds.length;
    const humanReviewedSampleSize = sampleSize;

    let matches = 0;
    let confirmedFalsePositives = 0;

    for (const feedbackId of uniqueShadowFeedbackIds) {
      const feedback = feedbackById.get(feedbackId);
      const history = shadowHistories.find(
        item => item.feedbackId === feedbackId,
      );
      if (!feedback || !history) {
        continue;
      }

      const expectedStatus = AUTO_REVIEW_DECISION_STATUS_MAP[history.decision];
      if (expectedStatus === feedback.status) {
        matches += 1;
      }

      if (
        history.decision === AutoReviewDecision.approve &&
        feedback.status === FeedbackStatus.corrected
      ) {
        confirmedFalsePositives += 1;
      }
    }

    const agreementRate = this.ratio(matches, sampleSize);
    const falsePositiveRate = this.ratio(confirmedFalsePositives, sampleSize);
    const reasons: string[] = [];

    if (!trainingEligibleFeedbacks.length) {
      reasons.push('Nenhum feedback revisado disponivel para aprendizado.');
    }

    if (sampleSize < criteriaApplied.minShadowSamples) {
      reasons.push(
        `Amostra shadow insuficiente (${sampleSize}/${criteriaApplied.minShadowSamples}).`,
      );
    }

    if (agreementRate < criteriaApplied.minAgreementRate) {
      reasons.push(
        `Acordo shadow x humano (${agreementRate}) abaixo do minimo (${criteriaApplied.minAgreementRate}).`,
      );
    }

    if (falsePositiveRate > criteriaApplied.maxFalsePositiveRate) {
      reasons.push(
        `Taxa de falso positivo confirmado (${falsePositiveRate}) acima do limite (${criteriaApplied.maxFalsePositiveRate}).`,
      );
    }

    reasons.push(
      'Promocao exige aprovador humano e plano de rollback; eligible nao autoativa alias, regra ou modelo.',
    );

    return {
      datasetVersion: DATASET_VERSION,
      reviewVersions: shadowVersionComparisons.map(item => item.reviewVersion),
      sampleSize,
      humanReviewedSampleSize,
      agreementRate,
      falsePositiveRate,
      criteriaApplied,
      rollbackRequired: true,
      reasons,
    };
  }

  private buildPromotionReadiness(evidence: AutoReviewPromotionEvidence): {
    eligible: boolean;
    reasons: string[];
  } {
    const criteria = evidence.criteriaApplied;
    const blockers = evidence.reasons.filter(
      reason =>
        !reason.includes('aprovador humano') &&
        !reason.includes('Nenhum feedback revisado'),
    );

    const hasSample = evidence.sampleSize >= criteria.minShadowSamples;
    const hasAgreement = evidence.agreementRate >= criteria.minAgreementRate;
    const hasSafeFp =
      evidence.falsePositiveRate <= criteria.maxFalsePositiveRate;
    const hasRollback = evidence.rollbackRequired;
    const eligible = hasSample && hasAgreement && hasSafeFp && hasRollback;

    if (!evidence.humanReviewedSampleSize && !evidence.sampleSize) {
      return {
        eligible: false,
        reasons: evidence.reasons,
      };
    }

    if (eligible) {
      return {
        eligible: true,
        reasons: [
          'Amostra e metricas atendem a politica de alias para o aprovador humano decidir promocao.',
          'Eligible nao autoativa comportamento nem altera status de feedback.',
        ],
      };
    }

    return {
      eligible: false,
      reasons: blockers.length ? blockers : evidence.reasons,
    };
  }

  private resolvePredictedValue(
    feedback: FeedbackEntity,
    field: AutoReviewLearningField,
  ): string | number | undefined {
    switch (field) {
      case 'intent':
        return feedback.predictedIntent;
      case 'account':
        return feedback.predictedAccount;
      case 'originAccount':
        return feedback.predictedOriginAccount;
      case 'destinyAccount':
        return feedback.predictedDestinyAccount;
      case 'category':
        return feedback.predictedCategory;
      case 'value':
        return feedback.predictedValue;
      case 'date':
        return feedback.predictedDate;
    }
  }

  private resolveCorrectedValue(
    feedback: FeedbackEntity,
    field: AutoReviewLearningField,
  ): string | number | undefined {
    switch (field) {
      case 'intent':
        return feedback.correctedIntent;
      case 'account':
        return feedback.correctedAccount;
      case 'originAccount':
        return feedback.correctedOriginAccount;
      case 'destinyAccount':
        return feedback.correctedDestinyAccount;
      case 'category':
        return feedback.correctedCategory;
      case 'value':
        return feedback.correctedValue;
      case 'date':
        return feedback.correctedDate;
    }
  }

  private resolveCanonicalValue(
    feedback: FeedbackEntity,
    field: AutoReviewLearningField,
  ): string | number | undefined {
    return (
      this.resolveCorrectedValue(feedback, field) ??
      this.resolvePredictedValue(feedback, field)
    );
  }

  private sameValue(
    left: string | number | undefined,
    right: string | number | undefined,
  ): boolean {
    if (!this.hasValue(left) || !this.hasValue(right)) {
      return false;
    }

    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) === Number(right);
    }

    return this.normalize(String(left)) === this.normalize(String(right));
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  private ratio(value: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Number((value / total).toFixed(4));
  }

  private normalize(value: string | number | undefined): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s*.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private resolveMaxExamples(maxExamples: number): number {
    const parsed = Number(maxExamples);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_MAX_EXAMPLES;
    }

    return Math.floor(parsed);
  }
}
