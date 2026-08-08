import { Inject, Injectable } from '@nestjs/common';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AUTO_REVIEW_DECISION_STATUS_MAP,
  AUTO_REVIEW_PROMOTION_POLICY,
  AUTO_REVIEW_THRESHOLDS,
  AutoReviewDecision,
  AutoReviewLearningField,
  AutoReviewMode,
  AutoReviewPromotionCandidateType,
  AutoReviewQualityFieldScoreMetric,
  AutoReviewQualityGuardrailBlock,
  AutoReviewQualityIntentMetrics,
  AutoReviewQualityMetricsFilters,
  AutoReviewQualityMetricsResult,
  AutoReviewQualityModeCount,
  AutoReviewQualityValueBandMetrics,
  AutoReviewReasonSeverity,
  AutoReviewValueBand,
  FeedbackStatus,
} from '../interfaces';

const MIN_SAMPLES_FOR_ALIAS_INSPECTION = 5;
const LOW_FIELD_SCORE_THRESHOLD = 0.7;
const QUALITY_FIELDS: AutoReviewLearningField[] = [
  'intent',
  'account',
  'originAccount',
  'destinyAccount',
  'category',
  'value',
  'date',
];

type ShadowPair = {
  history: FeedbackAutoReviewEntity;
  feedback: FeedbackEntity;
};

@Injectable()
export class FeedbackAutoReviewQualityService {
  constructor(
    @Inject('FEEDBACK_REPOSITORY')
    private readonly _feedbackRepository: Repository<FeedbackEntity>,
    @Inject('FEEDBACK_AUTO_REVIEW_REPOSITORY')
    private readonly _feedbackAutoReviewRepository: Repository<FeedbackAutoReviewEntity>,
  ) {}

  /**
   * Monta metricas somente leitura de confianca do autoavaliador (shadow x humano).
   */
  async buildQualityMetrics(
    owner: string,
    filters: AutoReviewQualityMetricsFilters = {},
  ): Promise<AutoReviewQualityMetricsResult> {
    const valueApprovalLimit = this.resolveValueApprovalLimit(
      filters.valueApprovalLimit,
    );
    const histories = await this._feedbackAutoReviewRepository.find({
      where: this.buildHistoryWhere(owner, filters),
      order: {
        evaluatedAt: 'DESC',
      },
    });

    const feedbackIds = [
      ...new Set(histories.map(history => history.feedbackId)),
    ];
    const feedbackById = await this.loadFeedbacksById(owner, feedbackIds);
    const shadowHistories = histories.filter(
      history => history.mode === AutoReviewMode.shadow,
    );
    const shadowPairs = shadowHistories
      .map(history => {
        const feedback = feedbackById.get(history.feedbackId);
        return feedback ? { history, feedback } : undefined;
      })
      .filter((pair): pair is ShadowPair => !!pair);

    const humanReviewedPairs = shadowPairs.filter(
      pair => pair.feedback.status !== FeedbackStatus.pending,
    );
    const pendingPairs = shadowPairs.filter(
      pair => pair.feedback.status === FeedbackStatus.pending,
    );
    const autoApplied = histories.filter(
      history => history.mode === AutoReviewMode.automatic && history.applied,
    ).length;

    const agreementCount = humanReviewedPairs.filter(pair =>
      this.isAgreement(pair),
    ).length;
    const potentialFalsePositives = shadowPairs.filter(pair =>
      this.isPotentialFalsePositive(pair),
    ).length;
    const guardrailBlocksByCode = this.buildGuardrailBlocks(histories);
    const guardrailBlocks = guardrailBlocksByCode.reduce(
      (total, item) => total + item.count,
      0,
    );

    const summary = {
      shadowVolume: shadowPairs.length,
      humanReviewedWithShadow: humanReviewedPairs.length,
      pendingWithShadow: pendingPairs.length,
      autoApplied,
      agreementCount,
      agreementRate: this.rate(agreementCount, humanReviewedPairs.length),
      potentialFalsePositives,
      potentialFalsePositiveRate: this.rate(
        potentialFalsePositives,
        shadowPairs.length,
      ),
      guardrailBlocks,
    };

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        from: filters.from,
        to: filters.to,
        valueApprovalLimit,
      },
      summary,
      byMode: this.buildByMode(histories),
      byDecision: this.buildByDecision(histories),
      byIntent: this.buildByIntent(shadowPairs),
      byField: this.buildByField(shadowPairs),
      byValueBand: this.buildByValueBand(shadowPairs, valueApprovalLimit),
      guardrailBlocksByCode,
      aliasInspectionReadiness: this.buildAliasInspectionReadiness(summary),
    };
  }

  private async loadFeedbacksById(
    owner: string,
    feedbackIds: string[],
  ): Promise<Map<string, FeedbackEntity>> {
    if (!feedbackIds.length) {
      return new Map();
    }

    const feedbacks = await this._feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.owner = :owner', { owner })
      .andWhere('feedback.id IN (:...feedbackIds)', { feedbackIds })
      .getMany();

    return new Map(feedbacks.map(feedback => [feedback.id, feedback]));
  }

  private buildHistoryWhere(
    owner: string,
    filters: AutoReviewQualityMetricsFilters,
  ): FindOptionsWhere<FeedbackAutoReviewEntity> {
    const where: FindOptionsWhere<FeedbackAutoReviewEntity> = { owner };

    if (filters.from && filters.to) {
      where.evaluatedAt = Between(filters.from, filters.to);
      return where;
    }

    if (filters.from) {
      where.evaluatedAt = MoreThanOrEqual(filters.from);
    }

    if (filters.to) {
      where.evaluatedAt = LessThanOrEqual(filters.to);
    }

    return where;
  }

  private buildByMode(
    histories: FeedbackAutoReviewEntity[],
  ): AutoReviewQualityModeCount[] {
    const modes = Object.values(AutoReviewMode);

    return modes
      .map(mode => {
        const items = histories.filter(history => history.mode === mode);
        return {
          mode,
          total: items.length,
          applied: items.filter(item => item.applied).length,
          byDecision: this.buildByDecision(items),
        };
      })
      .filter(item => item.total > 0);
  }

  private buildByDecision(
    histories: FeedbackAutoReviewEntity[],
  ): Array<{ decision: AutoReviewDecision; total: number }> {
    const counts = new Map<AutoReviewDecision, number>();

    for (const history of histories) {
      counts.set(history.decision, (counts.get(history.decision) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([decision, total]) => ({ decision, total }))
      .sort((left, right) => right.total - left.total);
  }

  private buildByIntent(pairs: ShadowPair[]): AutoReviewQualityIntentMetrics[] {
    const byIntent = new Map<string, ShadowPair[]>();

    for (const pair of pairs) {
      const intent = this.resolveIntent(pair.feedback);
      const bucket = byIntent.get(intent) ?? [];
      bucket.push(pair);
      byIntent.set(intent, bucket);
    }

    return [...byIntent.entries()]
      .map(([intent, intentPairs]) => ({
        intent,
        ...this.buildPairMetrics(intentPairs),
      }))
      .sort((left, right) => right.shadowVolume - left.shadowVolume);
  }

  private buildByValueBand(
    pairs: ShadowPair[],
    valueApprovalLimit: number,
  ): AutoReviewQualityValueBandMetrics[] {
    const bands: AutoReviewValueBand[] = [
      'within_limit',
      'above_limit',
      'unknown',
    ];

    return bands
      .map(band => {
        const bandPairs = pairs.filter(
          pair =>
            this.resolveValueBand(pair.feedback, valueApprovalLimit) === band,
        );
        return {
          band,
          ...this.buildPairMetrics(bandPairs),
        };
      })
      .filter(item => item.shadowVolume > 0);
  }

  private buildPairMetrics(pairs: ShadowPair[]): {
    shadowVolume: number;
    humanReviewedWithShadow: number;
    agreementCount: number;
    agreementRate: number;
    potentialFalsePositives: number;
    potentialFalsePositiveRate: number;
  } {
    const humanReviewed = pairs.filter(
      pair => pair.feedback.status !== FeedbackStatus.pending,
    );
    const agreementCount = humanReviewed.filter(pair =>
      this.isAgreement(pair),
    ).length;
    const potentialFalsePositives = pairs.filter(pair =>
      this.isPotentialFalsePositive(pair),
    ).length;

    return {
      shadowVolume: pairs.length,
      humanReviewedWithShadow: humanReviewed.length,
      agreementCount,
      agreementRate: this.rate(agreementCount, humanReviewed.length),
      potentialFalsePositives,
      potentialFalsePositiveRate: this.rate(
        potentialFalsePositives,
        pairs.length,
      ),
    };
  }

  private buildByField(
    pairs: ShadowPair[],
  ): AutoReviewQualityFieldScoreMetric[] {
    return QUALITY_FIELDS.map(field => {
      const scores = pairs
        .map(pair => pair.history.fieldScores?.[field])
        .filter((score): score is number => typeof score === 'number');
      const averageScore = scores.length
        ? Number(
            (
              scores.reduce((total, score) => total + score, 0) / scores.length
            ).toFixed(4),
          )
        : 0;

      return {
        field,
        samples: scores.length,
        averageScore,
        lowScoreCount: scores.filter(score => score < LOW_FIELD_SCORE_THRESHOLD)
          .length,
      };
    }).filter(item => item.samples > 0);
  }

  private buildGuardrailBlocks(
    histories: FeedbackAutoReviewEntity[],
  ): AutoReviewQualityGuardrailBlock[] {
    const counts = new Map<string, AutoReviewQualityGuardrailBlock>();

    for (const history of histories) {
      for (const reason of history.reasons ?? []) {
        if (
          reason.severity !== AutoReviewReasonSeverity.blocker &&
          reason.severity !== AutoReviewReasonSeverity.warning
        ) {
          continue;
        }

        const key = `${reason.code}:${reason.severity}`;
        const current = counts.get(key);
        if (current) {
          current.count += 1;
          continue;
        }

        counts.set(key, {
          code: reason.code,
          severity: reason.severity,
          count: 1,
        });
      }
    }

    return [...counts.values()].sort((left, right) => right.count - left.count);
  }

  private buildAliasInspectionReadiness(summary: {
    humanReviewedWithShadow: number;
    agreementRate: number;
    potentialFalsePositiveRate: number;
  }): { eligible: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const aliasCriteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ];

    if (summary.humanReviewedWithShadow < MIN_SAMPLES_FOR_ALIAS_INSPECTION) {
      reasons.push(
        `Amostra humana com shadow insuficiente (${summary.humanReviewedWithShadow}/${MIN_SAMPLES_FOR_ALIAS_INSPECTION}).`,
      );
    }

    if (summary.humanReviewedWithShadow < aliasCriteria.minShadowSamples) {
      reasons.push(
        `Amostra ainda abaixo do minimo de promocao de alias (${summary.humanReviewedWithShadow}/${aliasCriteria.minShadowSamples}).`,
      );
    }

    if (summary.agreementRate < aliasCriteria.minAgreementRate) {
      reasons.push(
        `Acordo shadow x humano (${summary.agreementRate}) abaixo do minimo de promocao (${aliasCriteria.minAgreementRate}).`,
      );
    }

    if (
      summary.potentialFalsePositiveRate > aliasCriteria.maxFalsePositiveRate
    ) {
      reasons.push(
        `Taxa de falso positivo potencial (${summary.potentialFalsePositiveRate}) acima do limite de promocao (${aliasCriteria.maxFalsePositiveRate}).`,
      );
    }

    const eligible =
      summary.humanReviewedWithShadow >= MIN_SAMPLES_FOR_ALIAS_INSPECTION;

    if (eligible && reasons.length === 0) {
      reasons.push(
        'Amostra e metricas permitem inspecionar candidatos de alias com revisao humana.',
      );
    } else if (eligible) {
      reasons.unshift(
        'Ha amostra minima para inspecionar divergencias e candidatos de alias; promocao continua bloqueada pelos criterios abaixo.',
      );
    }

    return { eligible, reasons };
  }

  private isAgreement(pair: ShadowPair): boolean {
    const expectedStatus =
      AUTO_REVIEW_DECISION_STATUS_MAP[pair.history.decision];
    return pair.feedback.status === expectedStatus;
  }

  private isPotentialFalsePositive(pair: ShadowPair): boolean {
    if (pair.history.decision !== AutoReviewDecision.approve) {
      return false;
    }

    return (
      pair.feedback.status === FeedbackStatus.corrected ||
      pair.feedback.status === FeedbackStatus.pending
    );
  }

  private resolveIntent(feedback: FeedbackEntity): string {
    const intent =
      feedback.correctedIntent?.trim() ||
      feedback.predictedIntent?.trim() ||
      'unknown';
    return intent.toLowerCase();
  }

  private resolveValueBand(
    feedback: FeedbackEntity,
    limit: number,
  ): AutoReviewValueBand {
    const raw = feedback.correctedValue ?? feedback.predictedValue;
    const value = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(value)) {
      return 'unknown';
    }

    return value > limit ? 'above_limit' : 'within_limit';
  }

  private resolveValueApprovalLimit(limit?: number): number {
    return Number.isFinite(limit) && (limit as number) > 0
      ? (limit as number)
      : AUTO_REVIEW_THRESHOLDS.maxAutoApprovalValue;
  }

  private rate(numerator: number, denominator: number): number {
    if (!denominator) {
      return 0;
    }

    return Number((numerator / denominator).toFixed(4));
  }
}
