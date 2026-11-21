import { Injectable } from '@nestjs/common';
import {
  AUTO_REVIEW_PROMOTION_POLICY,
  AutoReviewComparativeReplayAction,
  AutoReviewComparativeReplayResult,
  AutoReviewComparativeReplaySampleBucket,
  AutoReviewComparativeReplaySegment,
  AutoReviewComparativeReplayValueBandFp,
  AutoReviewPromotionCandidate,
  AutoReviewPromotionCriteria,
  AutoReviewPromotionPolicySegmentVerdict,
  AutoReviewPromotionStatus,
  AutoReviewQualityIntentMetrics,
  AutoReviewQualityMetricsResult,
  AutoReviewQualityValueBandMetrics,
  buildAutoReviewPromotionReplayResult,
} from '../interfaces';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import { FeedbackAutoReviewPromotionService } from './feedback-auto-review-promotion.service';
import { FeedbackAutoReviewQualityService } from './feedback-auto-review-quality.service';

const DEFAULT_RECENT_DAYS = 30;
const MIN_SPLIT_SAMPLES = 5;

type ComparativeFilters = {
  from?: string;
  to?: string;
  recentDays?: number;
  valueApprovalLimit?: number;
};

@Injectable()
export class FeedbackAutoReviewComparativeReplayService {
  constructor(
    private readonly _promotionService: FeedbackAutoReviewPromotionService,
    private readonly _qualityService: FeedbackAutoReviewQualityService,
  ) {}

  /**
   * Crash-test comparativo por segmento (AUTO-031) — somente leitura.
   */
  async buildComparativeReplay(
    owner: string,
    candidateVersion: string,
    filters: ComparativeFilters = {},
  ): Promise<AutoReviewComparativeReplayResult> {
    const candidate = await this._promotionService.getCandidate(
      owner,
      candidateVersion,
    );
    const criteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[candidate.type];
    const recentDays = filters.recentDays ?? DEFAULT_RECENT_DAYS;
    const now = filters.to ? new Date(filters.to) : new Date();
    const recentFrom = new Date(now);
    recentFrom.setUTCDate(recentFrom.getUTCDate() - recentDays);

    const [currentQuality, olderQuality, recentQuality] = await Promise.all([
      this._qualityService.buildQualityMetrics(owner, {
        from: filters.from,
        to: filters.to,
        valueApprovalLimit: filters.valueApprovalLimit,
      }),
      this._qualityService.buildQualityMetrics(owner, {
        from: filters.from,
        to: recentFrom.toISOString(),
        valueApprovalLimit: filters.valueApprovalLimit,
      }),
      this._qualityService.buildQualityMetrics(owner, {
        from: recentFrom.toISOString(),
        to: filters.to ?? now.toISOString(),
        valueApprovalLimit: filters.valueApprovalLimit,
      }),
    ]);

    const gates = buildAutoReviewPromotionReplayResult(
      this.toPromotionCandidate(candidate),
    );
    const currentBucket = this.toBucketFromSummary(currentQuality);
    const candidateBucket: AutoReviewComparativeReplaySampleBucket = {
      sampleSize: candidate.evidence.sampleSize,
      agreementRate: candidate.evidence.shadowAgreementRate,
      falsePositiveRate: candidate.evidence.falsePositiveRate,
    };
    const bySegment = this.buildSegments(currentQuality, criteria);
    const falsePositivesByValueBand = this.buildValueBandFp(
      currentQuality,
      olderQuality,
      recentQuality,
    );
    const sampleSplit = this.buildSampleSplit(olderQuality, recentQuality);
    const drift = this.buildDrift(sampleSplit);
    const recommendation = this.buildRecommendation(
      gates,
      bySegment,
      candidate,
    );
    const rejectedReprocess = this.buildRejectedReprocess(
      candidate,
      currentQuality,
    );
    const reduction = candidate.expectedImpact?.expectedManualReviewReduction;

    return {
      generatedAt: new Date().toISOString(),
      candidateVersion: candidate.candidateVersion,
      baseReviewVersion: candidate.baseReviewVersion,
      type: candidate.type,
      status: candidate.status,
      runtimeEffective: false,
      sampleSplit,
      drift,
      global: {
        gates,
        current: currentBucket,
        candidate: candidateBucket,
        deltas: {
          agreementRate: Number(
            (
              candidateBucket.agreementRate - currentBucket.agreementRate
            ).toFixed(4),
          ),
          falsePositiveRate: Number(
            (
              candidateBucket.falsePositiveRate -
              currentBucket.falsePositiveRate
            ).toFixed(4),
          ),
        },
      },
      bySegment,
      falsePositivesByValueBand,
      operationalGain: {
        expectedManualReviewReductionRate:
          typeof reduction === 'number' ? reduction : undefined,
        basis: typeof reduction === 'number' ? 'estimate' : 'unavailable',
      },
      recommendation,
      rejectedReprocess,
    };
  }

  private buildSampleSplit(
    older: AutoReviewQualityMetricsResult,
    recent: AutoReviewQualityMetricsResult,
  ): AutoReviewComparativeReplayResult['sampleSplit'] {
    const olderBucket = this.toBucketFromSummary(older);
    const recentBucket = this.toBucketFromSummary(recent);
    const usable =
      olderBucket.sampleSize >= MIN_SPLIT_SAMPLES &&
      recentBucket.sampleSize >= MIN_SPLIT_SAMPLES;

    if (!usable) {
      return {
        mode: 'stub',
        older: olderBucket.sampleSize > 0 ? olderBucket : null,
        recent: recentBucket.sampleSize > 0 ? recentBucket : null,
        note: 'Split temporal insuficiente para holdout; modo stub honesto (sem fingir train/val/test).',
      };
    }

    return {
      mode: 'temporal',
      older: olderBucket,
      recent: recentBucket,
      note: 'Split temporal simples (janela recente vs anterior); não é holdout ML estrito.',
    };
  }

  private buildDrift(
    split: AutoReviewComparativeReplayResult['sampleSplit'],
  ): AutoReviewComparativeReplayResult['drift'] {
    if (split.mode === 'stub' || !split.older || !split.recent) {
      return {
        flag: 'unknown',
        summary: 'Drift não mensurável com split atual.',
        note: 'Exige amostras temporalmente separáveis; reavaliar quando houver volume em ambas as janelas.',
      };
    }

    const agreementDelta = Number(
      (split.recent.agreementRate - split.older.agreementRate).toFixed(4),
    );
    const fpDelta = Number(
      (split.recent.falsePositiveRate - split.older.falsePositiveRate).toFixed(
        4,
      ),
    );
    const drifted =
      Math.abs(agreementDelta) >= 0.02 || Math.abs(fpDelta) >= 0.005;

    return {
      flag: drifted,
      summary: `Δagreement=${agreementDelta}, ΔFP=${fpDelta} (recent vs older).`,
      note: drifted
        ? 'Mudança temporal acima do limiar heurístico; observar antes de promover.'
        : 'Sem drift material na heurística P0.',
    };
  }

  private buildSegments(
    quality: AutoReviewQualityMetricsResult,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewComparativeReplaySegment[] {
    const intents = quality.byIntent
      .filter(item => item.humanReviewedWithShadow > 0 || item.shadowVolume > 0)
      .map(item => this.mapIntent(item, criteria));
    const bands = quality.byValueBand
      .filter(item => item.shadowVolume > 0)
      .map(item => this.mapBand(item, criteria));
    return [...intents, ...bands];
  }

  private mapIntent(
    item: AutoReviewQualityIntentMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewComparativeReplaySegment {
    const verdict = this.verdict(
      item.humanReviewedWithShadow,
      item.agreementRate,
      item.potentialFalsePositiveRate,
      criteria,
    );
    const hiddenRegression =
      item.intent === 'create' &&
      verdict === 'below_current' &&
      item.humanReviewedWithShadow >= criteria.minShadowSamples;

    return {
      kind: 'intent',
      key: item.intent,
      sampleSize: item.humanReviewedWithShadow,
      current: {
        agreementRate: item.agreementRate,
        falsePositiveRate: item.potentialFalsePositiveRate,
        verdict,
      },
      candidate: {
        agreementRate: null,
        falsePositiveRate: null,
        evidenceAvailable: false,
      },
      delta: { agreementRate: null, falsePositiveRate: null },
      hiddenRegression,
      note: hiddenRegression
        ? 'Regressão/segmento fraco pode ficar escondida no score global.'
        : 'Métricas do candidato por intent ainda indisponíveis (sem replay segmentado do alias).',
    };
  }

  private mapBand(
    item: AutoReviewQualityValueBandMetrics,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewComparativeReplaySegment {
    if (item.band === 'above_limit') {
      return {
        kind: 'value_band',
        key: item.band,
        sampleSize: item.humanReviewedWithShadow,
        current: {
          agreementRate: item.agreementRate,
          falsePositiveRate: item.potentialFalsePositiveRate,
          verdict: 'excluded_human_exception',
        },
        candidate: {
          agreementRate: null,
          falsePositiveRate: null,
          evidenceAvailable: false,
        },
        delta: { agreementRate: null, falsePositiveRate: null },
        hiddenRegression: false,
        note: 'Exceção humana: fora do crash-test de qualidade NLP.',
      };
    }

    const verdict = this.verdict(
      item.humanReviewedWithShadow,
      item.agreementRate,
      item.potentialFalsePositiveRate,
      criteria,
    );

    return {
      kind: 'value_band',
      key: item.band,
      sampleSize: item.humanReviewedWithShadow,
      current: {
        agreementRate: item.agreementRate,
        falsePositiveRate: item.potentialFalsePositiveRate,
        verdict,
      },
      candidate: {
        agreementRate: null,
        falsePositiveRate: null,
        evidenceAvailable: false,
      },
      delta: { agreementRate: null, falsePositiveRate: null },
      hiddenRegression: false,
      note: 'Baseline atual da faixa; evidência segmentada do candidato pendente.',
    };
  }

  private verdict(
    sampleSize: number,
    agreementRate: number,
    falsePositiveRate: number,
    criteria: AutoReviewPromotionCriteria,
  ): AutoReviewPromotionPolicySegmentVerdict {
    if (sampleSize < criteria.minShadowSamples) {
      return 'insufficient_sample';
    }
    const meetsAgreement = agreementRate >= criteria.minAgreementRate;
    const meetsFp = falsePositiveRate <= criteria.maxFalsePositiveRate;
    if (meetsAgreement && meetsFp) {
      return 'meets_current';
    }
    if (meetsAgreement || meetsFp) {
      return 'near_current';
    }
    return 'below_current';
  }

  private buildValueBandFp(
    current: AutoReviewQualityMetricsResult,
    older: AutoReviewQualityMetricsResult,
    recent: AutoReviewQualityMetricsResult,
  ): AutoReviewComparativeReplayValueBandFp[] {
    return current.byValueBand
      .filter(band => band.shadowVolume > 0)
      .map(band => {
        const olderBand = older.byValueBand.find(
          item => item.band === band.band,
        );
        const recentBand = recent.byValueBand.find(
          item => item.band === band.band,
        );
        const delta =
          olderBand && recentBand
            ? Number(
                (
                  recentBand.potentialFalsePositiveRate -
                  olderBand.potentialFalsePositiveRate
                ).toFixed(4),
              )
            : null;

        return {
          key: band.band,
          rate: band.potentialFalsePositiveRate,
          delta,
          note:
            band.band === 'above_limit'
              ? 'Exceção humana — não usar como FP de qualidade NLP.'
              : 'FP potencial da baseline atual (shadow approve × humano corrected/pending).',
        };
      });
  }

  private buildRecommendation(
    gates: ReturnType<typeof buildAutoReviewPromotionReplayResult>,
    bySegment: AutoReviewComparativeReplaySegment[],
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
  ): AutoReviewComparativeReplayResult['recommendation'] {
    const blockers = [...gates.blockers];
    const transfer = bySegment.find(
      item => item.kind === 'intent' && item.key === 'transfer',
    );
    const create = bySegment.find(
      item => item.kind === 'intent' && item.key === 'create',
    );
    const hasHidden = bySegment.some(item => item.hiddenRegression);

    let action: AutoReviewComparativeReplayAction = 'observe';
    let rationale =
      'Observar: evidência insuficiente ou mista para promoção segura.';

    if (
      gates.eligible &&
      !hasHidden &&
      candidate.evidence.shadowAgreementRate > 0
    ) {
      action = 'promote';
      rationale =
        'Gates do candidato ok e sem regressão segmentada oculta — ainda exige aprovador humano; runtimeEffective=false.';
    } else if (
      candidate.evidence.regressionRate >
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[candidate.type]
        .maxRegressionRate
    ) {
      action = 'reject';
      rationale = 'Regressão do candidato acima do limite da política v1.';
    } else if (
      transfer?.current.verdict === 'meets_current' &&
      create?.current.verdict === 'below_current'
    ) {
      action = 'reduce_scope';
      rationale =
        'Global/create fracos, transfer forte: reduzir escopo (parcial futuro AUTO-032), não promover global.';
    } else if (!gates.eligible) {
      action = 'observe';
      rationale = `Gates do candidato bloqueados (${blockers.join(', ') || 'unknown'}); coletar evidência shadow antes de promote.`;
    }

    if (action === 'promote' && hasHidden) {
      action = 'reduce_scope';
      rationale =
        'Gates globais ok, mas há regressão escondida por segmento — reduzir escopo.';
      blockers.push('hidden_segment_regression');
    }

    return { action, rationale, blockers };
  }

  private buildRejectedReprocess(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    quality: AutoReviewQualityMetricsResult,
  ): AutoReviewComparativeReplayResult['rejectedReprocess'] {
    if (candidate.status !== AutoReviewPromotionStatus.rejected) {
      return {
        eligibleForReprocess: null,
        reason:
          'Sinal só se aplica a candidatos rejected; demais status: deferred.',
      };
    }

    if (!candidate.rejectedAt) {
      return {
        eligibleForReprocess: false,
        reason:
          'Rejeitado sem rejectedAt; não há âncora temporal de evidência nova.',
      };
    }

    const rejectedMs = Date.parse(candidate.rejectedAt);
    const hasNewerShadow = quality.summary.humanReviewedWithShadow > 0;
    // P0: sem timeline por feedback no quality; só sinaliza se amostra owner existe pós-rejeição de forma conservadora.
    if (Number.isNaN(rejectedMs) || !hasNewerShadow) {
      return {
        eligibleForReprocess: null,
        reason:
          'Evidência nova pós-rejeição não demonstrável de forma óbvia neste relatório (deferred; sem reprocess automático).',
      };
    }

    const candidateCreatedMs = Date.parse(candidate.createdAt);
    if (
      !Number.isNaN(candidateCreatedMs) &&
      quality.summary.humanReviewedWithShadow > candidate.evidence.sampleSize
    ) {
      return {
        eligibleForReprocess: true,
        reason:
          'Owner tem amostra humana+shadow maior que a evidência do candidato rejeitado — elegível a reavaliação manual (sem disparar reprocess).',
      };
    }

    return {
      eligibleForReprocess: null,
      reason:
        'Sem evidência nova óbvia pós-rejeição; não reprocessar automaticamente.',
    };
  }

  private toBucketFromSummary(
    quality: AutoReviewQualityMetricsResult,
  ): AutoReviewComparativeReplaySampleBucket {
    return {
      sampleSize: quality.summary.humanReviewedWithShadow,
      agreementRate: quality.summary.agreementRate,
      falsePositiveRate: quality.summary.potentialFalsePositiveRate,
    };
  }

  private toPromotionCandidate(
    entity: FeedbackAutoReviewPromotionCandidateEntity,
  ): AutoReviewPromotionCandidate {
    return {
      type: entity.type,
      status: entity.status,
      origin: entity.origin,
      candidateVersion: entity.candidateVersion,
      baseReviewVersion: entity.baseReviewVersion,
      evidence: entity.evidence,
      expectedImpact: entity.expectedImpact,
      knownRisk: entity.knownRisk,
      rollbackPlan: entity.rollbackPlan,
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy ?? undefined,
      rejectedBy: entity.rejectedBy ?? undefined,
      appliedBy: entity.appliedBy ?? undefined,
      rolledBackBy: entity.rolledBackBy ?? undefined,
      createdAt: entity.createdAt,
      approvedAt: entity.approvedAt ?? undefined,
      rejectedAt: entity.rejectedAt ?? undefined,
      appliedAt: entity.appliedAt ?? undefined,
      rolledBackAt: entity.rolledBackAt ?? undefined,
      rollbackReason: entity.rollbackReason ?? undefined,
      notes: entity.notes ?? undefined,
    };
  }
}
