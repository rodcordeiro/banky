import { Injectable } from '@nestjs/common';
import {
  AUTO_REVIEW_PROMOTION_POLICY,
  AutoReviewAliasSuggestionItem,
  AutoReviewLearningCoverageBucket,
  AutoReviewLearningReassessmentBlocker,
  AutoReviewLearningReassessmentRecommendation,
  AutoReviewLearningReassessmentResult,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionStatus,
  AutoReviewQualityMetricsResult,
  AutoReviewShadowVersionComparison,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewLearningService } from './feedback-auto-review-learning.service';
import { FeedbackAutoReviewAliasSuggestionService } from './feedback-auto-review-alias-suggestion.service';
import { FeedbackAutoReviewPromotionService } from './feedback-auto-review-promotion.service';
import { FeedbackAutoReviewQualityService } from './feedback-auto-review-quality.service';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';

const MIN_COMPARABLE_SAMPLES = 5;
const LOW_SAMPLE_THRESHOLD = 3;
const DOMINANT_SHARE_THRESHOLD = 0.45;
const DEFAULT_MAX_DIVERGENCES = 20;

type WindowFilters = {
  from?: string;
  to?: string;
  baselineFrom?: string;
  baselineTo?: string;
  maxExamples?: number;
};

@Injectable()
export class FeedbackAutoReviewLearningReassessmentService {
  constructor(
    private readonly _learningService: FeedbackAutoReviewLearningService,
    private readonly _aliasSuggestionService: FeedbackAutoReviewAliasSuggestionService,
    private readonly _promotionService: FeedbackAutoReviewPromotionService,
    private readonly _qualityService: FeedbackAutoReviewQualityService,
  ) {}

  /**
   * Reavalia o learning loop supervisionado (AUTO-028) sem aumentar autonomia.
   */
  async buildReassessment(
    owner: string,
    filters: WindowFilters = {},
  ): Promise<AutoReviewLearningReassessmentResult> {
    const maxExamples = filters.maxExamples ?? DEFAULT_MAX_DIVERGENCES;
    const learning = await this._learningService.buildLearningLoopReport(
      owner,
      maxExamples,
    );
    const aliasReport =
      await this._aliasSuggestionService.buildAliasSuggestions(owner);
    const candidates = await this._promotionService.listCandidates(owner);
    const quality = await this._qualityService.buildQualityMetrics(owner, {
      from: filters.from,
      to: filters.to,
    });

    const aliasCriteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ];
    const aliasCandidates = candidates.filter(
      item => item.type === AutoReviewPromotionCandidateType.alias,
    );
    const promoteCount = aliasCandidates.length;
    const candidatesCreated = aliasCandidates.filter(item =>
      [
        AutoReviewPromotionStatus.candidate,
        AutoReviewPromotionStatus.shadowValidated,
        AutoReviewPromotionStatus.approved,
        AutoReviewPromotionStatus.active,
      ].includes(item.status),
    ).length;

    const aliasEffectivePromotionBlockers = this.buildAliasEffectiveBlockers(
      aliasCandidates,
      learning.promotionReadiness.eligible,
      aliasCriteria.minAgreementRate,
      aliasCriteria.minShadowSamples,
    );
    const aliasEffectivePromotionEligible =
      aliasEffectivePromotionBlockers.length === 0;

    const validatedLearning =
      learning.promotionEvidence.agreementRate >=
        aliasCriteria.minAgreementRate &&
      learning.promotionEvidence.humanReviewedSampleSize >=
        aliasCriteria.minShadowSamples;

    const coverage = this.buildCoverage(quality, learning.dataset.sampleCounts);
    const recurringDivergences = this.buildRecurringDivergences(
      aliasReport.items,
      maxExamples,
    );
    const beforeAfter = this.buildBeforeAfter(
      learning.shadowVersionComparisons,
    );
    const gapsAndBiases = this.buildGapsAndBiases(learning, coverage, quality);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        from: filters.from,
        to: filters.to,
        baselineFrom: filters.baselineFrom,
        baselineTo: filters.baselineTo,
      },
      dataset: {
        version: learning.dataset.version,
        criteria: {
          excludePending: true,
          excludeAutoAppliedFromTraining: true,
          includeStatuses: [FeedbackStatus.validated, FeedbackStatus.corrected],
        },
        volume: {
          humanReviewed: learning.dataset.humanReviewedFeedbacks,
          trainingEligible: learning.dataset.trainingEligibleFeedbacks,
          autoApplied: learning.dataset.autoAppliedFeedbacks,
        },
        recency: {
          newestAt: quality.generatedAt,
          oldestAt: null,
          medianAgeDays: null,
        },
        representativeness: coverage,
      },
      qualityBySource: {
        humanReviewed: {
          samples: learning.dataset.humanReviewedFeedbacks,
          agreementRate: null,
        },
        shadow: {
          samples: quality.summary.shadowVolume,
          agreementRate: quality.summary.agreementRate,
        },
        assistive: {
          samples: aliasReport.items.length,
          agreementRate: null,
        },
        automaticLimited: {
          samples: quality.summary.autoApplied,
          agreementRate: null,
          applied: quality.summary.autoApplied,
        },
      },
      coverage,
      promotionVsLearning: {
        aliasSuggestionVolume: aliasReport.items.length,
        promoteCount,
        candidatesCreated,
        validatedLearning,
        note: 'promote ≠ aprendizado validado; candidato alias com shadowAgreementRate=0 nao conta como aprendizado efetivo.',
      },
      recurringDivergencesWithoutCandidate: recurringDivergences,
      beforeAfter,
      gapsAndBiases,
      signals: {
        inspectionReady: learning.inspectionReady,
        promotionEvidence: learning.promotionEvidence,
        promotionReadiness: learning.promotionReadiness,
        aliasEffectivePromotionEligible,
        aliasEffectivePromotionBlockers,
      },
      recommendations: this.buildRecommendations({
        aliasEffectivePromotionEligible,
        aliasEffectivePromotionBlockers,
        inspectionReady: learning.inspectionReady,
        eligible: learning.promotionReadiness.eligible,
        validatedLearning,
        gapsAndBiases,
        beforeAfterStatus: beforeAfter.status,
        promoteCount,
        recurringWithoutCandidate: recurringDivergences.length,
      }),
      runtimeEffective: false,
    };
  }

  private buildAliasEffectiveBlockers(
    aliasCandidates: FeedbackAutoReviewPromotionCandidateEntity[],
    policyEligible: boolean,
    minAgreementRate: number,
    minShadowSamples: number,
  ): string[] {
    const blockers: string[] = [];

    if (!aliasCandidates.length) {
      blockers.push('missing_alias_shadow');
    }

    const hasEffectiveEvidence = aliasCandidates.some(candidate => {
      const rate = Number(candidate.evidence?.shadowAgreementRate ?? 0);
      const samples = Number(candidate.evidence?.sampleSize ?? 0);
      return rate >= minAgreementRate && samples >= minShadowSamples;
    });

    if (!hasEffectiveEvidence) {
      blockers.push('shadowAgreementRate=0');
      blockers.push('missing_alias_shadow');
    }

    if (!policyEligible) {
      blockers.push('promotion_policy_not_eligible');
    }

    return [...new Set(blockers)];
  }

  private buildCoverage(
    quality: AutoReviewQualityMetricsResult,
    sampleCounts: Record<string, number>,
  ): {
    byIntent: AutoReviewLearningCoverageBucket[];
    byCategory: AutoReviewLearningCoverageBucket[];
    byAccount: AutoReviewLearningCoverageBucket[];
    byValueBand: AutoReviewLearningCoverageBucket[];
  } {
    const intentTotal = quality.byIntent.reduce(
      (sum, item) => sum + item.humanReviewedWithShadow,
      0,
    );
    const valueTotal = quality.byValueBand.reduce(
      (sum, item) => sum + item.humanReviewedWithShadow,
      0,
    );

    return {
      byIntent:
        quality.byIntent.length > 0
          ? quality.byIntent.map(item =>
              this.toBucket(
                item.intent || 'unknown',
                item.humanReviewedWithShadow,
                intentTotal || 1,
              ),
            )
          : [
              this.toBucket(
                'intent_labeled',
                sampleCounts.intent ?? 0,
                sampleCounts.intent || 1,
              ),
            ],
      byCategory: [
        this.toBucket(
          'category_labeled',
          sampleCounts.category ?? 0,
          sampleCounts.category || 1,
        ),
      ],
      byAccount: [
        this.toBucket(
          'account_labeled',
          sampleCounts.account ?? 0,
          sampleCounts.account || 1,
        ),
      ],
      byValueBand:
        quality.byValueBand.length > 0
          ? quality.byValueBand.map(item =>
              this.toBucket(
                item.band,
                item.humanReviewedWithShadow,
                valueTotal || 1,
              ),
            )
          : [
              this.toBucket(
                'value_labeled',
                sampleCounts.value ?? 0,
                sampleCounts.value || 1,
              ),
            ],
    };
  }

  private buildRecurringDivergences(
    items: AutoReviewAliasSuggestionItem[],
    maxExamples: number,
  ) {
    return items
      .filter(item => !item.alreadyPromoted)
      .map(item => {
        const blocker = this.resolveBlocker(item);
        return {
          field: item.field,
          pattern: item.pattern,
          predicted: item.predicted,
          corrected: item.corrected,
          count: item.count,
          blocker,
          isFailure: false,
        };
      })
      .sort((left, right) => right.count - left.count)
      .slice(0, maxExamples);
  }

  private resolveBlocker(
    item: AutoReviewAliasSuggestionItem,
  ): AutoReviewLearningReassessmentBlocker {
    if (item.conflict) {
      return 'conflict';
    }
    if (item.alreadyRejected) {
      return 'already_rejected';
    }
    if (item.alreadyPromoted) {
      return 'already_promoted';
    }
    if (!item.meetsMinimumVolume) {
      return 'below_min_volume';
    }
    // Sugestao elegivel ainda sem candidato promovido.
    return 'other';
  }

  private buildBeforeAfter(
    comparisons: AutoReviewShadowVersionComparison[],
  ): AutoReviewLearningReassessmentResult['beforeAfter'] {
    const sorted = [...comparisons].sort((left, right) =>
      left.reviewVersion.localeCompare(right.reviewVersion),
    );

    if (sorted.length < 2) {
      const only = sorted[0];
      const window = {
        agreementRate: only?.agreementRate ?? 0,
        divergenceRate: only ? this.ratio(only.divergences, only.total) : 0,
        sampleSize: only?.total ?? 0,
      };
      return {
        status: 'insufficientHistory',
        before: window,
        after: window,
        deltas: { agreementRate: 0, divergenceRate: 0 },
      };
    }

    const beforeCmp = sorted[0];
    const afterCmp = sorted[sorted.length - 1];
    const comparable =
      beforeCmp.total >= MIN_COMPARABLE_SAMPLES &&
      afterCmp.total >= MIN_COMPARABLE_SAMPLES;

    const before = {
      agreementRate: beforeCmp.agreementRate,
      divergenceRate: this.ratio(beforeCmp.divergences, beforeCmp.total),
      sampleSize: beforeCmp.total,
    };
    const after = {
      agreementRate: afterCmp.agreementRate,
      divergenceRate: this.ratio(afterCmp.divergences, afterCmp.total),
      sampleSize: afterCmp.total,
    };

    return {
      status: comparable ? 'comparable' : 'insufficientHistory',
      before,
      after,
      deltas: {
        agreementRate: Number(
          (after.agreementRate - before.agreementRate).toFixed(4),
        ),
        divergenceRate: Number(
          (after.divergenceRate - before.divergenceRate).toFixed(4),
        ),
      },
    };
  }

  private buildGapsAndBiases(
    learning: {
      fieldMetrics: Array<{
        field: string;
        total: number;
        accuracy: number;
        correctedLabels: number;
      }>;
      inspectionReady: boolean;
    },
    coverage: {
      byCategory: AutoReviewLearningCoverageBucket[];
      byIntent: AutoReviewLearningCoverageBucket[];
    },
    quality: AutoReviewQualityMetricsResult,
  ) {
    const lowSampleSegments = learning.fieldMetrics
      .filter(metric => metric.total > 0 && metric.total < LOW_SAMPLE_THRESHOLD)
      .map(metric => `field:${metric.field}`);

    for (const field of quality.byField) {
      if (field.samples > 0 && field.samples < LOW_SAMPLE_THRESHOLD) {
        lowSampleSegments.push(`score_field:${field.field}`);
      }
    }

    const dominantSegments = [...coverage.byCategory, ...coverage.byIntent]
      .filter(bucket => bucket.share >= DOMINANT_SHARE_THRESHOLD)
      .map(bucket => bucket.key);

    const lowConfidenceFields = learning.fieldMetrics
      .filter(
        metric => metric.total >= LOW_SAMPLE_THRESHOLD && metric.accuracy < 0.8,
      )
      .map(metric => metric.field);

    const labelGaps = learning.fieldMetrics
      .filter(metric => metric.total > 0 && metric.correctedLabels === 0)
      .map(metric => metric.field);

    if (!learning.inspectionReady) {
      lowSampleSegments.push('inspection_not_ready');
    }

    return {
      lowSampleSegments: [...new Set(lowSampleSegments)],
      dominantSegments,
      lowConfidenceFields,
      labelGaps,
    };
  }

  private buildRecommendations(input: {
    aliasEffectivePromotionEligible: boolean;
    aliasEffectivePromotionBlockers: string[];
    inspectionReady: boolean;
    eligible: boolean;
    validatedLearning: boolean;
    gapsAndBiases: {
      lowSampleSegments: string[];
      lowConfidenceFields: string[];
      labelGaps: string[];
    };
    beforeAfterStatus: 'comparable' | 'insufficientHistory';
    promoteCount: number;
    recurringWithoutCandidate: number;
  }): AutoReviewLearningReassessmentRecommendation[] {
    const recommendations: AutoReviewLearningReassessmentRecommendation[] = [
      {
        code: 'do_not_increase_autonomy',
        priority: 1,
        rationale:
          'AUTO-028 apenas reavalia o learning loop; autonomia automatica permanece desligada.',
      },
    ];

    if (!input.aliasEffectivePromotionEligible) {
      recommendations.push({
        code: 'await_alias_runtime',
        priority: 2,
        rationale: `Alias ainda nao elegivel a promocao efetiva (${input.aliasEffectivePromotionBlockers.join(', ') || 'sem evidencia shadow'}). Depende de AUTO-034.`,
      });
    }

    if (
      input.gapsAndBiases.lowSampleSegments.length ||
      input.gapsAndBiases.labelGaps.length
    ) {
      recommendations.push({
        code: 'collect_labels',
        priority: 3,
        rationale:
          'Ha segmentos com amostra baixa ou sem labels corrigidos; priorizar revisao humana nesses campos.',
      });
    }

    if (input.gapsAndBiases.lowConfidenceFields.length) {
      recommendations.push({
        code: 'reduce_scope',
        priority: 4,
        rationale: `Campos com baixa confianca (${input.gapsAndBiases.lowConfidenceFields.join(', ')}); reduzir escopo de autonomia nestes segmentos.`,
      });
    }

    if (input.recurringWithoutCandidate > 0 || input.promoteCount > 0) {
      recommendations.push({
        code: 'inspect_aliases',
        priority: 5,
        rationale:
          'Ha divergencias/sugestoes de alias na fila; inspecionar conflitos e volume antes de promote. Promote nao valida aprendizado.',
      });
    }

    if (
      input.beforeAfterStatus === 'insufficientHistory' ||
      !input.validatedLearning
    ) {
      recommendations.push({
        code: 'observe',
        priority: 6,
        rationale:
          'Historico before/after insuficiente ou aprendizado ainda nao validado; manter observacao em shadow.',
      });
    }

    if (input.inspectionReady && !input.eligible) {
      recommendations.push({
        code: 'observe',
        priority: 7,
        rationale:
          'inspectionReady=true com eligible=false: vale inspecionar, mas nao promover.',
      });
    }

    return recommendations.sort(
      (left, right) => left.priority - right.priority,
    );
  }

  private toBucket(
    key: string,
    count: number,
    total: number,
  ): AutoReviewLearningCoverageBucket {
    return {
      key,
      count,
      share: this.ratio(count, total),
    };
  }

  private ratio(value: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Number((value / total).toFixed(4));
  }
}
