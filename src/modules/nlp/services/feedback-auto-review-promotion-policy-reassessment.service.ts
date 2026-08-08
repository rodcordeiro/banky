import { Injectable } from '@nestjs/common';
import {
  AUTO_REVIEW_PROMOTION_POLICY,
  AUTO_REVIEW_PROMOTION_POLICY_VERSION,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionCriteria,
  AutoReviewPromotionPolicyHumanException,
  AutoReviewPromotionPolicyObservedBucket,
  AutoReviewPromotionPolicyObservedSegment,
  AutoReviewPromotionPolicyProposedSegment,
  AutoReviewPromotionPolicyReassessmentResult,
  AutoReviewPromotionPolicyRecommendation,
  AutoReviewPromotionPolicySegmentVerdict,
  AutoReviewQualityIntentMetrics,
  AutoReviewQualityMetricsFilters,
  AutoReviewQualityValueBandMetrics,
} from '../interfaces';
import { FeedbackAutoReviewQualityService } from './feedback-auto-review-quality.service';

const PRIORITY_INTENTS = ['transfer', 'create'] as const;
const PROPOSAL_VERSION = 'v1.1-proposal';

@Injectable()
export class FeedbackAutoReviewPromotionPolicyReassessmentService {
  constructor(
    private readonly _qualityService: FeedbackAutoReviewQualityService,
  ) {}

  /**
   * Reavalia a política de promoção (AUTO-029) sem mutar critérios vivos.
   */
  async buildReassessment(
    owner: string,
    filters: AutoReviewQualityMetricsFilters = {},
  ): Promise<AutoReviewPromotionPolicyReassessmentResult> {
    const quality = await this._qualityService.buildQualityMetrics(
      owner,
      filters,
    );
    const criteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ];

    const globalRaw = this.buildBucket(
      quality.summary.humanReviewedWithShadow,
      quality.summary.agreementRate,
      quality.summary.potentialFalsePositiveRate,
      criteria,
    );

    const eligibilityBands = quality.byValueBand.filter(
      band => band.band !== 'above_limit',
    );
    const eligibilityAgg = this.aggregateBands(eligibilityBands);
    const globalForEligibility = this.buildBucket(
      eligibilityAgg.sampleSize,
      eligibilityAgg.agreementRate,
      eligibilityAgg.falsePositiveRate,
      criteria,
    );

    const byIntent = quality.byIntent
      .filter(item => item.humanReviewedWithShadow > 0)
      .map(item => this.mapIntentSegment(item, criteria))
      .sort((left, right) => right.sampleSize - left.sampleSize);

    const byValueBand = quality.byValueBand
      .filter(item => item.humanReviewedWithShadow > 0 || item.shadowVolume > 0)
      .map(item => this.mapValueBandSegment(item, criteria));

    const humanExceptions = this.buildHumanExceptions(quality.byValueBand);
    const proposedBySegment = this.buildProposedSegments(byIntent, byValueBand);
    const recommendations = this.buildRecommendations(
      globalForEligibility,
      byIntent,
      byValueBand,
    );

    return {
      generatedAt: new Date().toISOString(),
      policyVersion: AUTO_REVIEW_PROMOTION_POLICY_VERSION,
      proposalVersion: PROPOSAL_VERSION,
      runtimeEffective: false,
      applied: false,
      filters: {
        from: filters.from,
        to: filters.to,
        valueApprovalLimit: quality.filters.valueApprovalLimit,
      },
      referenceCandidateType: AutoReviewPromotionCandidateType.alias,
      observed: {
        globalRaw,
        globalForEligibility,
        byIntent,
        byValueBand,
      },
      currentCriteria: { ...criteria },
      automaticBlockers: [...AUTO_REVIEW_PROMOTION_POLICY.automaticBlockers],
      proposedCriteria: {
        scope: 'segment',
        allowsAutoPromotion: false,
        keepGlobalCriteria: true,
        bySegment: proposedBySegment,
      },
      humanExceptions,
      evidenceRetention: {
        keepShadowHistory: true,
        keepPromotionCandidates: true,
        note: 'Manter histórico shadow e candidatos de promoção para replay/auditoria; sem purge automático no AUTO-029.',
      },
      recommendations,
    };
  }

  private aggregateBands(bands: AutoReviewQualityValueBandMetrics[]): {
    sampleSize: number;
    agreementRate: number;
    falsePositiveRate: number;
  } {
    const sampleSize = bands.reduce(
      (total, band) => total + band.humanReviewedWithShadow,
      0,
    );
    const agreementCount = bands.reduce(
      (total, band) => total + band.agreementCount,
      0,
    );
    const falsePositives = bands.reduce(
      (total, band) => total + band.potentialFalsePositives,
      0,
    );
    const shadowVolume = bands.reduce(
      (total, band) => total + band.shadowVolume,
      0,
    );

    return {
      sampleSize,
      agreementRate: this.rate(agreementCount, sampleSize),
      falsePositiveRate: this.rate(falsePositives, shadowVolume),
    };
  }

  private buildBucket(
    sampleSize: number,
    agreementRate: number,
    falsePositiveRate: number,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewPromotionPolicyObservedBucket {
    const blockers: string[] = [];

    if (sampleSize < criteria.minShadowSamples) {
      blockers.push('insufficient_shadow_samples');
    }
    if (agreementRate < criteria.minAgreementRate) {
      blockers.push('insufficient_agreement_rate');
    }
    if (falsePositiveRate > criteria.maxFalsePositiveRate) {
      blockers.push('false_positive_regression');
    }

    return {
      sampleSize,
      agreementRate,
      falsePositiveRate,
      eligible: blockers.length === 0,
      blockers,
    };
  }

  private mapIntentSegment(
    item: AutoReviewQualityIntentMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewPromotionPolicyObservedSegment {
    return this.mapSegment({
      kind: 'intent',
      key: item.intent,
      sampleSize: item.humanReviewedWithShadow,
      agreementRate: item.agreementRate,
      falsePositiveRate: item.potentialFalsePositiveRate,
      criteria,
      suggestion: this.suggestForIntent(item, criteria),
    });
  }

  private mapValueBandSegment(
    item: AutoReviewQualityValueBandMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewPromotionPolicyObservedSegment {
    if (item.band === 'above_limit') {
      return {
        kind: 'value_band',
        key: item.band,
        sampleSize: item.humanReviewedWithShadow,
        agreementRate: item.agreementRate,
        falsePositiveRate: item.potentialFalsePositiveRate,
        vsCurrent: 'excluded_human_exception',
        meetsMinSamples:
          item.humanReviewedWithShadow >= criteria.minShadowSamples,
        meetsAgreement: false,
        meetsFalsePositive: false,
        suggestion:
          'Excluir de métricas de qualidade NLP: shadow força manual_review por value_above_limit.',
      };
    }

    return this.mapSegment({
      kind: 'value_band',
      key: item.band,
      sampleSize: item.humanReviewedWithShadow,
      agreementRate: item.agreementRate,
      falsePositiveRate: item.potentialFalsePositiveRate,
      criteria,
      suggestion: this.suggestForValueBand(item, criteria),
    });
  }

  private mapSegment(input: {
    kind: AutoReviewPromotionPolicyObservedSegment['kind'];
    key: string;
    sampleSize: number;
    agreementRate: number;
    falsePositiveRate: number;
    criteria: AutoReviewPromotionCriteria;
    suggestion: string;
  }): AutoReviewPromotionPolicyObservedSegment {
    const meetsMinSamples = input.sampleSize >= input.criteria.minShadowSamples;
    const meetsAgreement =
      input.agreementRate >= input.criteria.minAgreementRate;
    const meetsFalsePositive =
      input.falsePositiveRate <= input.criteria.maxFalsePositiveRate;

    return {
      kind: input.kind,
      key: input.key,
      sampleSize: input.sampleSize,
      agreementRate: input.agreementRate,
      falsePositiveRate: input.falsePositiveRate,
      vsCurrent: this.resolveVerdict(
        meetsMinSamples,
        meetsAgreement,
        meetsFalsePositive,
      ),
      meetsMinSamples,
      meetsAgreement,
      meetsFalsePositive,
      suggestion: input.suggestion,
    };
  }

  private resolveVerdict(
    meetsMinSamples: boolean,
    meetsAgreement: boolean,
    meetsFalsePositive: boolean,
  ): AutoReviewPromotionPolicySegmentVerdict {
    if (!meetsMinSamples) {
      return 'insufficient_sample';
    }
    if (meetsAgreement && meetsFalsePositive) {
      return 'meets_current';
    }
    if (meetsAgreement || meetsFalsePositive) {
      return 'near_current';
    }
    return 'below_current';
  }

  private suggestForIntent(
    item: AutoReviewQualityIntentMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): string {
    if (item.intent === 'transfer') {
      if (
        item.humanReviewedWithShadow >= criteria.minShadowSamples &&
        item.agreementRate >= criteria.minAgreementRate &&
        item.potentialFalsePositiveRate <= criteria.maxFalsePositiveRate
      ) {
        return 'Já atende critérios v1 do tipo alias; observar para promoção parcial futura (AUTO-032), sem autoativar.';
      }
      return 'Priorizar transfer no acompanhamento de segmento.';
    }

    if (item.intent === 'create') {
      return 'Mantém restrição global: acordo abaixo do mínimo; não afrouxar limiares vivos.';
    }

    return 'Observar segmento; política viva permanece v1.';
  }

  private suggestForValueBand(
    item: AutoReviewQualityValueBandMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): string {
    if (item.band === 'within_limit') {
      if (
        item.agreementRate >= criteria.minAgreementRate &&
        item.potentialFalsePositiveRate > criteria.maxFalsePositiveRate
      ) {
        return 'Acordo ok, FP>0: qualquer maxFP>0 só como proposta de segmento humano-gated; não aplicar agora.';
      }
      return 'Faixa operacional principal; manter critérios v1.';
    }

    return 'Observar faixa; política viva permanece v1.';
  }

  private buildHumanExceptions(
    bands: AutoReviewQualityValueBandMetrics[],
  ): AutoReviewPromotionPolicyHumanException[] {
    const above = bands.find(band => band.band === 'above_limit');
    if (!above || above.shadowVolume === 0) {
      return [];
    }

    return [
      {
        code: 'above_limit_excluded',
        segmentKind: 'value_band',
        segmentKey: 'above_limit',
        reason:
          'Shadow decide manual_review por value_above_limit; agreement≈0 não mede qualidade NLP e continua exigindo revisão humana.',
      },
    ];
  }

  private buildProposedSegments(
    byIntent: AutoReviewPromotionPolicyObservedSegment[],
    byValueBand: AutoReviewPromotionPolicyObservedSegment[],
  ): AutoReviewPromotionPolicyProposedSegment[] {
    const proposed: AutoReviewPromotionPolicyProposedSegment[] = [];

    for (const intent of PRIORITY_INTENTS) {
      const segment = byIntent.find(item => item.key === intent);
      if (!segment) {
        continue;
      }

      if (intent === 'transfer') {
        proposed.push({
          kind: 'intent',
          key: 'transfer',
          action: 'observe',
          rationale:
            segment.vsCurrent === 'meets_current'
              ? 'Segmento já conforme v1; candidatar promoção parcial só após AUTO-030/032, com aprovador humano.'
              : 'Acompanhar transfer até atingir critérios v1; sem afrouxar global.',
        });
        continue;
      }

      proposed.push({
        kind: 'intent',
        key: 'create',
        action: 'keep_restrictive',
        rationale:
          'Create puxa a média global abaixo de 0.98; proposta de afrouxamento global rejeitada.',
      });
    }

    const within = byValueBand.find(item => item.key === 'within_limit');
    if (within) {
      proposed.push({
        kind: 'value_band',
        key: 'within_limit',
        action: 'document_only',
        proposedCriteria:
          within.meetsAgreement && !within.meetsFalsePositive
            ? {
                maxFalsePositiveRate: within.falsePositiveRate,
                allowsAutoPromotion: false,
                requiresApprover: true,
              }
            : undefined,
        rationale:
          'Documentar FP residual sob within_limit; qualquer tolerância de FP fica só como proposta, applied=false.',
      });
    }

    const above = byValueBand.find(item => item.key === 'above_limit');
    if (above) {
      proposed.push({
        kind: 'value_band',
        key: 'above_limit',
        action: 'exclude',
        rationale:
          'Exceção humana permanente: fora do cálculo de elegibilidade de promoção.',
      });
    }

    return proposed;
  }

  private buildRecommendations(
    globalForEligibility: AutoReviewPromotionPolicyObservedBucket,
    byIntent: AutoReviewPromotionPolicyObservedSegment[],
    byValueBand: AutoReviewPromotionPolicyObservedSegment[],
  ): AutoReviewPromotionPolicyRecommendation[] {
    const recommendations: AutoReviewPromotionPolicyRecommendation[] = [
      {
        code: 'keep_global_criteria',
        message:
          'Manter AUTO_REVIEW_PROMOTION_POLICY v1 (alias ≥0.98 / FP=0 / aprovar humano). Propostas de segmento não alteram approve/apply.',
      },
      {
        code: 'do_not_enable_auto_promotion',
        message:
          'allowsAutoPromotion permanece false para todos os tipos de candidato.',
      },
      {
        code: 'await_alias_runtime',
        message:
          'Approve de alias continua bloqueado até evidência shadow do próprio alias / AUTO-034 (runtimeEffective).',
      },
      {
        code: 'retain_shadow_evidence',
        message:
          'Reter histórico shadow e candidatos para replay, auditoria e futuras reavaliações de política.',
      },
    ];

    if (!globalForEligibility.eligible) {
      recommendations.unshift({
        code: 'keep_global_criteria',
        message: `Elegibilidade global (sem above_limit) ainda falsa: blockers=${globalForEligibility.blockers.join(',') || 'none'}.`,
      });
    }

    const transfer = byIntent.find(item => item.key === 'transfer');
    if (transfer?.vsCurrent === 'meets_current') {
      recommendations.push({
        code: 'observe_segment_transfer',
        message:
          'transfer já atende v1; usar só como sinal de observação/promoção parcial futura, sem autoativar.',
      });
    }

    const create = byIntent.find(item => item.key === 'create');
    if (create && create.vsCurrent !== 'meets_current') {
      recommendations.push({
        code: 'keep_create_restrictive',
        message:
          'create abaixo do limiar: coletar labels/aliases antes de qualquer afrouxamento.',
      });
    }

    if (byValueBand.some(item => item.key === 'above_limit')) {
      recommendations.push({
        code: 'exclude_above_limit_from_quality',
        message:
          'Tratar above_limit/value_above_limit como exceção humana, não como falha de acordo NLP.',
      });
    }

    return recommendations;
  }

  private rate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      return 0;
    }
    return Number((numerator / denominator).toFixed(4));
  }
}
