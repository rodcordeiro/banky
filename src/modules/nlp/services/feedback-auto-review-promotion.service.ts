import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import {
  AUTO_REVIEW_PROMOTION_POLICY,
  AutoReviewComparativeReplayAction,
  AutoReviewPromotionCandidate,
  AutoReviewPromotionCandidateConflictItem,
  AutoReviewPromotionCandidateDetail,
  AutoReviewPromotionCandidateListItem,
  AutoReviewPromotionCandidateQualitySignals,
  AutoReviewPromotionCandidateSegmentSignal,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionHistoryEvent,
  AutoReviewPromotionHistoryResult,
  AutoReviewPromotionPolicySegmentVerdict,
  AutoReviewPromotionSegmentConfidence,
  AutoReviewPromotionStatus,
  AutoReviewQualityMetricsResult,
  AutoReviewSampleRevaluationTrigger,
  FeedbackAutoReviewPromotionCandidateSnapshot,
  buildAutoReviewPromotionReplayResult,
} from '../interfaces';
import { FeedbackAutoReviewQualityService } from './feedback-auto-review-quality.service';
import {
  EffectiveAliasDeactivationKind,
  FeedbackAutoReviewEffectiveAliasService,
} from './feedback-auto-review-effective-alias.service';
import { FeedbackAutoReviewShadowService } from './feedback-auto-review-shadow.service';

const APPROVED_EXPIRE_DAYS_DEFAULT = 14;

@Injectable()
export class FeedbackAutoReviewPromotionService {
  private readonly _logger = new Logger(
    FeedbackAutoReviewPromotionService.name,
  );

  constructor(
    @Inject('FEEDBACK_AUTO_REVIEW_PROMOTION_CANDIDATE_REPOSITORY')
    private readonly _candidateRepository: Repository<FeedbackAutoReviewPromotionCandidateEntity>,
    private readonly _qualityService: FeedbackAutoReviewQualityService,
    private readonly _effectiveAliasService: FeedbackAutoReviewEffectiveAliasService,
    private readonly _shadowService: FeedbackAutoReviewShadowService,
  ) {}

  async storeCandidate(
    owner: string,
    candidate: AutoReviewPromotionCandidate,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const existing = await this._candidateRepository.findOne({
      where: {
        owner,
        candidateVersion: candidate.candidateVersion,
      },
    });

    const payload = {
      owner,
      type: candidate.type,
      status: candidate.status,
      origin: candidate.origin,
      candidateVersion: candidate.candidateVersion,
      baseReviewVersion: candidate.baseReviewVersion,
      evidence: candidate.evidence,
      expectedImpact: candidate.expectedImpact,
      knownRisk: candidate.knownRisk,
      rollbackPlan: candidate.rollbackPlan,
      createdBy: candidate.createdBy,
      approvedBy: candidate.approvedBy ?? null,
      rejectedBy: candidate.rejectedBy ?? null,
      appliedBy: candidate.appliedBy ?? null,
      rolledBackBy: candidate.rolledBackBy ?? null,
      approvedAt: candidate.approvedAt ?? null,
      rejectedAt: candidate.rejectedAt ?? null,
      appliedAt: candidate.appliedAt ?? null,
      rolledBackAt: candidate.rolledBackAt ?? null,
      rollbackReason: candidate.rollbackReason ?? null,
      notes: candidate.notes ?? null,
    };

    const entity = existing
      ? this._candidateRepository.merge(existing, payload)
      : this._candidateRepository.create(payload);

    return this._candidateRepository.save(entity);
  }

  async listCandidates(
    owner: string,
    status?: AutoReviewPromotionStatus,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity[]> {
    return this._candidateRepository.find({
      where: {
        owner,
        ...(status ? { status } : {}),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Lista com preview leve da ficha do aprovador (AUTO-030/032).
   */
  async listCandidatesEnriched(
    owner: string,
    status?: AutoReviewPromotionStatus,
  ): Promise<AutoReviewPromotionCandidateListItem[]> {
    const [candidates, quality] = await Promise.all([
      this.listCandidates(owner, status),
      this._qualityService.buildQualityMetrics(owner),
    ]);

    const items: AutoReviewPromotionCandidateListItem[] = [];
    for (const candidate of candidates) {
      const signals = this.buildQualitySignals(candidate, candidates, quality);
      const workflow = this.buildWorkflowHint(candidate, signals);
      const runtimeEffective =
        await this._effectiveAliasService.hasActiveRuntime(
          owner,
          candidate.candidateVersion,
        );
      items.push({
        candidate: this.toSnapshot(candidate),
        qualityPreview: {
          approverSummary: signals.approverSummary.text,
          hasConflicts:
            signals.conflicts.activeSameScope.length > 0 ||
            signals.conflicts.rejectedSameScope.length > 0,
          minSamplesMet: signals.coverage.minSamplesMet,
          sampleSize: signals.coverage.sampleSize,
          worstSegmentVerdict: this.worstVerdict(signals.bySegment),
          workflowRecommendation: workflow.recommendation,
          riskLevel: candidate.knownRisk?.level,
        },
        runtimeEffective,
      });
    }

    return items.sort((left, right) => {
      const riskRank = { low: 0, medium: 1, high: 2 };
      const leftRisk = riskRank[left.qualityPreview.riskLevel ?? 'medium'];
      const rightRisk = riskRank[right.qualityPreview.riskLevel ?? 'medium'];
      if (leftRisk !== rightRisk) {
        return leftRisk - rightRisk;
      }
      return (
        (right.qualityPreview.sampleSize ?? 0) -
        (left.qualityPreview.sampleSize ?? 0)
      );
    });
  }

  async findCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity | null> {
    return this._candidateRepository.findOne({
      where: {
        owner,
        candidateVersion,
      },
    });
  }

  async getCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    return this.findRequiredCandidate(owner, candidateVersion);
  }

  /**
   * Detalhe com qualitySignals + workflow (AUTO-030/032).
   */
  async getCandidateEnriched(
    owner: string,
    candidateVersion: string,
  ): Promise<AutoReviewPromotionCandidateDetail> {
    const [candidate, peers, quality] = await Promise.all([
      this.findRequiredCandidate(owner, candidateVersion),
      this.listCandidates(owner),
      this._qualityService.buildQualityMetrics(owner),
    ]);
    const signals = this.buildQualitySignals(candidate, peers, quality);
    const runtimeEffective = await this._effectiveAliasService.hasActiveRuntime(
      owner,
      candidate.candidateVersion,
    );

    return {
      candidate: this.toSnapshot(candidate),
      qualitySignals: signals,
      workflow: this.buildWorkflowHint(candidate, signals),
      runtimeEffective,
    };
  }

  /**
   * Historico do ciclo; runtimeEffective reflete aliases ativos do owner/candidato.
   */
  async buildPromotionHistory(
    owner: string,
    candidateVersion?: string,
  ): Promise<AutoReviewPromotionHistoryResult> {
    const candidates = candidateVersion
      ? [await this.findRequiredCandidate(owner, candidateVersion)]
      : await this.listCandidates(owner);

    const items = (
      await Promise.all(
        candidates.map(async candidate => {
          const runtimeEffective =
            await this._effectiveAliasService.hasActiveRuntime(
              owner,
              candidate.candidateVersion,
            );
          return this.toHistoryEvents(candidate, runtimeEffective);
        }),
      )
    )
      .flat()
      .sort((left, right) => right.at.localeCompare(left.at));

    const anyRuntime = items.some(item => item.runtimeEffective);

    return {
      generatedAt: new Date().toISOString(),
      runtimeEffective: anyRuntime,
      items,
    };
  }

  async approveCandidate(
    owner: string,
    candidateVersion: string,
    approvedBy: string,
    notes?: string,
    options?: {
      reasonCode?: string;
      decisionVsRecommendation?: 'agree' | 'override';
      exceptionalReason?: string;
    },
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (
      ![
        AutoReviewPromotionStatus.candidate,
        AutoReviewPromotionStatus.shadowValidated,
      ].includes(candidate.status)
    ) {
      throw new BadRequestException('Candidato nao esta em estado aprovavel.');
    }

    if (this.isExpiredUnapplied(candidate)) {
      throw new BadRequestException(
        'Candidato com aprovacao expirada; reavalie antes de aprovar/aplicar.',
      );
    }

    const replay = buildAutoReviewPromotionReplayResult(
      this.toPromotionCandidate(candidate),
    );

    if (!replay.eligible) {
      throw new BadRequestException(
        `Candidato nao atende criterios de promocao: ${replay.blockers.join(', ')}`,
      );
    }

    if (options?.decisionVsRecommendation === 'override') {
      if (!options.exceptionalReason?.trim() || !options.reasonCode?.trim()) {
        throw new BadRequestException(
          'Aprovacao excepcional exige reasonCode e exceptionalReason.',
        );
      }
    }

    const auditNotes = [
      notes,
      options?.reasonCode ? `reasonCode=${options.reasonCode}` : undefined,
      options?.decisionVsRecommendation
        ? `decisionVsRecommendation=${options.decisionVsRecommendation}`
        : undefined,
      options?.exceptionalReason
        ? `exceptionalReason=${options.exceptionalReason}`
        : undefined,
      `approvedExpiresAt=${this.computeApprovedExpiresAt()}`,
    ]
      .filter(Boolean)
      .join('; ');

    candidate.status = AutoReviewPromotionStatus.approved;
    candidate.approvedBy = approvedBy;
    candidate.approvedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, auditNotes);

    return this._candidateRepository.save(candidate);
  }

  async rejectCandidate(
    owner: string,
    candidateVersion: string,
    rejectedBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (
      [
        AutoReviewPromotionStatus.active,
        AutoReviewPromotionStatus.rolledBack,
      ].includes(candidate.status)
    ) {
      throw new BadRequestException(
        'Candidato ativo ou revertido nao pode ser rejeitado.',
      );
    }

    candidate.status = AutoReviewPromotionStatus.rejected;
    candidate.rejectedBy = rejectedBy;
    candidate.rejectedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    return this._candidateRepository.save(candidate);
  }

  /**
   * Expira aprovacao sem apply (AUTO-032) — status rejected + motivo estruturado.
   */
  async expireApprovedCandidate(
    owner: string,
    candidateVersion: string,
    expiredBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (candidate.status !== AutoReviewPromotionStatus.approved) {
      throw new BadRequestException(
        'Somente candidato approved sem apply pode expirar.',
      );
    }

    candidate.status = AutoReviewPromotionStatus.rejected;
    candidate.rejectedBy = expiredBy;
    candidate.rejectedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(
      candidate.notes,
      [`expired_unapplied=true`, notes].filter(Boolean).join('; '),
    );

    return this._candidateRepository.save(candidate);
  }

  async applyCandidate(
    owner: string,
    candidateVersion: string,
    appliedBy: string,
    notes?: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (candidate.status === AutoReviewPromotionStatus.active) {
      return candidate;
    }

    if (candidate.status !== AutoReviewPromotionStatus.approved) {
      throw new BadRequestException(
        'Somente candidato aprovado pode ser aplicado.',
      );
    }

    if (this.isExpiredUnapplied(candidate)) {
      throw new BadRequestException(
        'Aprovacao expirada; use expire/reavalie antes de apply.',
      );
    }

    if (candidate.type === AutoReviewPromotionCandidateType.alias) {
      await this._effectiveAliasService.activateFromCandidate(
        owner,
        candidate,
        appliedBy,
      );
    }

    candidate.status = AutoReviewPromotionStatus.active;
    candidate.appliedBy = appliedBy;
    candidate.appliedAt = new Date().toISOString();
    candidate.notes = this.mergeNotes(candidate.notes, notes);

    const saved = await this._candidateRepository.save(candidate);

    if (candidate.type === AutoReviewPromotionCandidateType.alias) {
      await this.runSampleShadowRevaluation(saved, 'apply');
    }

    return saved;
  }

  async rollbackCandidate(
    owner: string,
    candidateVersion: string,
    rolledBackBy: string,
    reason: string,
    notes?: string,
    kind: EffectiveAliasDeactivationKind = 'immediate',
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findRequiredCandidate(owner, candidateVersion);

    if (!reason?.trim()) {
      throw new BadRequestException('Motivo do rollback e obrigatorio.');
    }

    if (candidate.status === AutoReviewPromotionStatus.rolledBack) {
      return candidate;
    }

    if (candidate.status !== AutoReviewPromotionStatus.active) {
      throw new BadRequestException(
        'Somente candidato ativo pode ser revertido.',
      );
    }

    if (candidate.type === AutoReviewPromotionCandidateType.alias) {
      await this._effectiveAliasService.deactivateByCandidateVersion(
        owner,
        candidate.candidateVersion,
        rolledBackBy,
        kind,
      );
    }

    candidate.status = AutoReviewPromotionStatus.rolledBack;
    candidate.rolledBackBy = rolledBackBy;
    candidate.rolledBackAt = new Date().toISOString();
    candidate.rollbackReason = `[kind=${kind}] ${reason.trim()}`;
    candidate.notes = this.mergeNotes(
      candidate.notes,
      [`rollbackKind=${kind}`, notes].filter(Boolean).join('; '),
    );

    const saved = await this._candidateRepository.save(candidate);

    if (candidate.type === AutoReviewPromotionCandidateType.alias) {
      await this.runSampleShadowRevaluation(saved, 'rollback');
    }

    return saved;
  }

  /**
   * Monta qualitySignals sem persistir nem alterar gates de approve.
   */
  buildQualitySignals(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    peers: FeedbackAutoReviewPromotionCandidateEntity[],
    quality: AutoReviewQualityMetricsResult,
  ): AutoReviewPromotionCandidateQualitySignals {
    const criteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[candidate.type];
    const sampleSize = candidate.evidence?.sampleSize ?? 0;
    const minSamplesMet = sampleSize >= criteria.minShadowSamples;
    const eligibleBands = quality.byValueBand.filter(
      band => band.band !== 'above_limit',
    );
    const eligibleSampleSize = eligibleBands.reduce(
      (total, band) => total + band.humanReviewedWithShadow,
      0,
    );
    const excludedHumanExceptions = quality.byValueBand.some(
      band => band.band === 'above_limit' && band.shadowVolume > 0,
    )
      ? ['above_limit']
      : [];

    const bySegment = this.buildSegmentSignals(quality, criteria);
    const conflicts = this.buildConflicts(candidate, peers);
    const operationalCost = this.buildOperationalCost(candidate);
    const temporal = this.buildTemporal(candidate);
    const coverage = {
      sampleSize,
      minSamplesRequired: criteria.minShadowSamples,
      minSamplesMet,
      shadowAgreementRate: candidate.evidence?.shadowAgreementRate ?? 0,
      falsePositiveRate: candidate.evidence?.falsePositiveRate ?? 0,
      eligibleSampleSize,
      excludedHumanExceptions,
    };
    const approverSummary = this.buildApproverSummary(
      candidate,
      coverage,
      bySegment,
      conflicts,
    );

    return {
      coverage,
      bySegment,
      operationalCost,
      temporal,
      conflicts,
      approverSummary,
    };
  }

  private buildSegmentSignals(
    quality: AutoReviewQualityMetricsResult,
    criteria: (typeof AUTO_REVIEW_PROMOTION_POLICY.criteriaByType)[keyof typeof AUTO_REVIEW_PROMOTION_POLICY.criteriaByType],
  ): AutoReviewPromotionCandidateSegmentSignal[] {
    const intents = quality.byIntent
      .filter(item => item.humanReviewedWithShadow > 0)
      .map(item =>
        this.toSegmentSignal({
          kind: 'intent',
          key: item.intent,
          sampleSize: item.humanReviewedWithShadow,
          agreementRate: item.agreementRate,
          falsePositiveRate: item.potentialFalsePositiveRate,
          criteria,
        }),
      );

    const bands = quality.byValueBand
      .filter(item => item.shadowVolume > 0)
      .map(item => {
        if (item.band === 'above_limit') {
          return {
            kind: 'value_band' as const,
            key: item.band,
            sampleSize: item.humanReviewedWithShadow,
            agreementRate: item.agreementRate,
            falsePositiveRate: item.potentialFalsePositiveRate,
            verdict: 'excluded_human_exception' as const,
            confidence: 'unknown' as const,
          };
        }

        return this.toSegmentSignal({
          kind: 'value_band',
          key: item.band,
          sampleSize: item.humanReviewedWithShadow,
          agreementRate: item.agreementRate,
          falsePositiveRate: item.potentialFalsePositiveRate,
          criteria,
        });
      });

    return [...intents, ...bands];
  }

  private toSegmentSignal(input: {
    kind: AutoReviewPromotionCandidateSegmentSignal['kind'];
    key: string;
    sampleSize: number;
    agreementRate: number;
    falsePositiveRate: number;
    criteria: (typeof AUTO_REVIEW_PROMOTION_POLICY.criteriaByType)[keyof typeof AUTO_REVIEW_PROMOTION_POLICY.criteriaByType];
  }): AutoReviewPromotionCandidateSegmentSignal {
    const meetsMinSamples = input.sampleSize >= input.criteria.minShadowSamples;
    const meetsAgreement =
      input.agreementRate >= input.criteria.minAgreementRate;
    const meetsFalsePositive =
      input.falsePositiveRate <= input.criteria.maxFalsePositiveRate;

    let verdict: AutoReviewPromotionPolicySegmentVerdict;
    if (!meetsMinSamples) {
      verdict = 'insufficient_sample';
    } else if (meetsAgreement && meetsFalsePositive) {
      verdict = 'meets_current';
    } else if (meetsAgreement || meetsFalsePositive) {
      verdict = 'near_current';
    } else {
      verdict = 'below_current';
    }

    return {
      kind: input.kind,
      key: input.key,
      sampleSize: input.sampleSize,
      agreementRate: input.agreementRate,
      falsePositiveRate: input.falsePositiveRate,
      verdict,
      confidence: this.toConfidence(verdict, meetsMinSamples),
    };
  }

  private toConfidence(
    verdict: AutoReviewPromotionPolicySegmentVerdict,
    meetsMinSamples: boolean,
  ): AutoReviewPromotionSegmentConfidence {
    if (verdict === 'excluded_human_exception') {
      return 'unknown';
    }
    if (!meetsMinSamples || verdict === 'insufficient_sample') {
      return 'low';
    }
    if (verdict === 'meets_current') {
      return 'high';
    }
    if (verdict === 'near_current') {
      return 'medium';
    }
    return 'low';
  }

  private buildConflicts(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    peers: FeedbackAutoReviewPromotionCandidateEntity[],
  ): AutoReviewPromotionCandidateQualitySignals['conflicts'] {
    const scopeKey = this.resolveScopeKey(candidate);
    const sameScope = peers.filter(
      peer =>
        peer.candidateVersion !== candidate.candidateVersion &&
        this.resolveScopeKey(peer) === scopeKey,
    );

    const toItem = (
      peer: FeedbackAutoReviewPromotionCandidateEntity,
    ): AutoReviewPromotionCandidateConflictItem => ({
      candidateVersion: peer.candidateVersion,
      status: peer.status,
      reason: peer.rollbackReason ?? peer.notes ?? undefined,
    });

    return {
      activeSameScope: sameScope
        .filter(peer => peer.status === AutoReviewPromotionStatus.active)
        .map(toItem),
      rejectedSameScope: sameScope
        .filter(peer => peer.status === AutoReviewPromotionStatus.rejected)
        .map(toItem),
    };
  }

  private resolveScopeKey(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
  ): string {
    const field =
      candidate.expectedImpact?.affectedFields?.[0] ??
      candidate.evidence?.examples?.[0]?.field ??
      'unknown';
    const example = candidate.evidence?.examples?.[0];
    if (example?.predicted != null && example?.corrected != null) {
      return `${candidate.type}|${field}|${String(example.predicted).toLowerCase()}|${String(example.corrected).toLowerCase()}`;
    }

    const notes = candidate.notes ?? '';
    const predicted = /predicted=([^;]+)/.exec(notes)?.[1]?.trim();
    const corrected = /corrected=([^;]+)/.exec(notes)?.[1]?.trim();
    if (predicted && corrected) {
      return `${candidate.type}|${field}|${predicted.toLowerCase()}|${corrected.toLowerCase()}`;
    }

    return `${candidate.type}|${field}|${candidate.candidateVersion}`;
  }

  private buildOperationalCost(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
  ): AutoReviewPromotionCandidateQualitySignals['operationalCost'] {
    const reduction = candidate.expectedImpact?.expectedManualReviewReduction;
    if (typeof reduction === 'number') {
      return {
        expectedReviewReductionRate: reduction,
        basis: 'estimate',
      };
    }

    return { basis: 'unavailable' };
  }

  private buildTemporal(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
  ): AutoReviewPromotionCandidateQualitySignals['temporal'] {
    const asOf = new Date().toISOString();
    const createdAt = candidate.createdAt;
    let stalenessDays: number | undefined;
    if (createdAt) {
      const createdMs = Date.parse(createdAt);
      if (!Number.isNaN(createdMs)) {
        stalenessDays = Math.max(
          0,
          Math.floor((Date.parse(asOf) - createdMs) / 86_400_000),
        );
      }
    }

    return {
      asOf,
      createdAt,
      stalenessDays,
      driftFlag: 'unknown',
    };
  }

  private buildApproverSummary(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    coverage: AutoReviewPromotionCandidateQualitySignals['coverage'],
    bySegment: AutoReviewPromotionCandidateSegmentSignal[],
    conflicts: AutoReviewPromotionCandidateQualitySignals['conflicts'],
  ): AutoReviewPromotionCandidateQualitySignals['approverSummary'] {
    const highlights: string[] = [];
    const transfer = bySegment.find(
      item => item.kind === 'intent' && item.key === 'transfer',
    );
    const create = bySegment.find(
      item => item.kind === 'intent' && item.key === 'create',
    );

    if (!coverage.minSamplesMet) {
      highlights.push(
        `Amostra do candidato (${coverage.sampleSize}) abaixo do mínimo (${coverage.minSamplesRequired}).`,
      );
    }
    if (coverage.shadowAgreementRate <= 0) {
      highlights.push(
        'shadowAgreementRate=0: evidência shadow do próprio candidato ausente até AUTO-034/replay.',
      );
    }
    if (transfer?.verdict === 'meets_current') {
      highlights.push('Segmento transfer atende política v1 (contexto owner).');
    }
    if (create && create.verdict !== 'meets_current') {
      highlights.push(
        'Segmento create abaixo do limiar — não afrouxar global.',
      );
    }
    if (coverage.excludedHumanExceptions.includes('above_limit')) {
      highlights.push(
        'above_limit é exceção humana, fora da elegibilidade NLP.',
      );
    }
    if (conflicts.activeSameScope.length > 0) {
      highlights.push(
        `Conflito: ${conflicts.activeSameScope.length} ativo(s) no mesmo escopo.`,
      );
    }
    if (conflicts.rejectedSameScope.length > 0) {
      highlights.push(
        `Conflito: ${conflicts.rejectedSameScope.length} rejeitado(s) no mesmo escopo.`,
      );
    }

    if (highlights.length === 0) {
      highlights.push('Sem conflitos óbvios; revisar evidência e política v1.');
    }

    const text = [
      `Candidato ${candidate.candidateVersion} (${candidate.type}/${candidate.status}).`,
      `Cobertura: n=${coverage.sampleSize}, acordoShadow=${coverage.shadowAgreementRate}, FP=${coverage.falsePositiveRate}.`,
      `Runtime efetivo=false; approve continua sujeito à política viva v1.`,
    ].join(' ');

    return { text, highlights };
  }

  private worstVerdict(
    segments: AutoReviewPromotionCandidateSegmentSignal[],
  ): AutoReviewPromotionPolicySegmentVerdict | undefined {
    const rank: Record<AutoReviewPromotionPolicySegmentVerdict, number> = {
      below_current: 0,
      near_current: 1,
      insufficient_sample: 2,
      excluded_human_exception: 3,
      meets_current: 4,
    };
    const ranked = segments
      .filter(item => item.verdict !== 'excluded_human_exception')
      .sort((left, right) => rank[left.verdict] - rank[right.verdict]);
    return ranked[0]?.verdict;
  }

  private toSnapshot(
    entity: FeedbackAutoReviewPromotionCandidateEntity,
  ): FeedbackAutoReviewPromotionCandidateSnapshot {
    return {
      id: entity.id,
      owner: entity.owner,
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
      approvedBy: entity.approvedBy ?? null,
      rejectedBy: entity.rejectedBy ?? null,
      appliedBy: entity.appliedBy ?? null,
      rolledBackBy: entity.rolledBackBy ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      approvedAt: entity.approvedAt ?? null,
      rejectedAt: entity.rejectedAt ?? null,
      appliedAt: entity.appliedAt ?? null,
      rolledBackAt: entity.rolledBackAt ?? null,
      rollbackReason: entity.rollbackReason ?? null,
      notes: entity.notes ?? null,
    };
  }

  private buildWorkflowHint(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    signals: AutoReviewPromotionCandidateQualitySignals,
  ): {
    recommendation: AutoReviewComparativeReplayAction;
    recommendationRationale: string;
    approvedExpiresAt?: string | null;
    expiredUnapplied?: boolean;
    observationNote?: string;
  } {
    const gates = buildAutoReviewPromotionReplayResult(
      this.toPromotionCandidate(candidate),
    );
    const transfer = signals.bySegment.find(
      item => item.kind === 'intent' && item.key === 'transfer',
    );
    const create = signals.bySegment.find(
      item => item.kind === 'intent' && item.key === 'create',
    );

    let recommendation: AutoReviewComparativeReplayAction = 'observe';
    let recommendationRationale =
      'Observar evidência antes de promover; gates/runtime sob política v1.';

    if (gates.eligible && signals.coverage.shadowAgreementRate > 0) {
      recommendation = 'promote';
      recommendationRationale =
        'Gates ok — ainda exige aprovador humano; apply ativa runtime de alias.';
    } else if (
      transfer?.verdict === 'meets_current' &&
      create &&
      create.verdict !== 'meets_current'
    ) {
      recommendation = 'reduce_scope';
      recommendationRationale =
        'transfer forte / create fraco — reduzir escopo; não promover global.';
    } else if (!gates.eligible) {
      recommendation = 'observe';
      recommendationRationale = `Gates bloqueados: ${gates.blockers.join(', ') || 'unknown'}.`;
    }

    const approvedExpiresAt = this.readApprovedExpiresAt(candidate.notes);
    const expiredUnapplied = this.isExpiredUnapplied(candidate);

    return {
      recommendation,
      recommendationRationale,
      approvedExpiresAt,
      expiredUnapplied,
      observationNote:
        candidate.status === AutoReviewPromotionStatus.active
          ? 'Candidato active no ciclo; acompanhar métricas (observação leve AUTO-032).'
          : undefined,
    };
  }

  private computeApprovedExpiresAt(): string {
    const expires = new Date();
    expires.setUTCDate(expires.getUTCDate() + APPROVED_EXPIRE_DAYS_DEFAULT);
    return expires.toISOString();
  }

  private readApprovedExpiresAt(notes?: string | null): string | null {
    const match = /approvedExpiresAt=([^;]+)/.exec(notes ?? '');
    return match?.[1]?.trim() ?? null;
  }

  private isExpiredUnapplied(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
  ): boolean {
    if (candidate.status !== AutoReviewPromotionStatus.approved) {
      return /expired_unapplied=true/.test(candidate.notes ?? '');
    }
    const expiresAt = this.readApprovedExpiresAt(candidate.notes);
    if (!expiresAt) {
      return false;
    }
    const expiresMs = Date.parse(expiresAt);
    return !Number.isNaN(expiresMs) && Date.now() > expiresMs;
  }

  private toHistoryEvents(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    runtimeEffective = false,
  ): AutoReviewPromotionHistoryEvent[] {
    const rollbackKind =
      /\[kind=([a-z]+)\]/.exec(candidate.rollbackReason ?? '')?.[1] ??
      /rollbackKind=([a-z]+)/.exec(candidate.notes ?? '')?.[1];

    const events: AutoReviewPromotionHistoryEvent[] = [
      {
        candidateVersion: candidate.candidateVersion,
        candidateType: candidate.type,
        cycleStatus: candidate.status,
        event: 'created',
        at: candidate.createdAt,
        by: candidate.createdBy,
        runtimeEffective: false,
        notes: candidate.notes ?? undefined,
      },
    ];

    if (candidate.approvedAt && candidate.approvedBy) {
      events.push({
        candidateVersion: candidate.candidateVersion,
        candidateType: candidate.type,
        cycleStatus: candidate.status,
        event: 'approved',
        at: candidate.approvedAt,
        by: candidate.approvedBy,
        runtimeEffective: false,
      });
    }

    if (candidate.rejectedAt && candidate.rejectedBy) {
      events.push({
        candidateVersion: candidate.candidateVersion,
        candidateType: candidate.type,
        cycleStatus: candidate.status,
        event: 'rejected',
        at: candidate.rejectedAt,
        by: candidate.rejectedBy,
        runtimeEffective: false,
      });
    }

    if (candidate.appliedAt && candidate.appliedBy) {
      events.push({
        candidateVersion: candidate.candidateVersion,
        candidateType: candidate.type,
        cycleStatus: candidate.status,
        event: 'applied',
        at: candidate.appliedAt,
        by: candidate.appliedBy,
        runtimeEffective,
      });
    }

    if (candidate.rolledBackAt && candidate.rolledBackBy) {
      events.push({
        candidateVersion: candidate.candidateVersion,
        candidateType: candidate.type,
        cycleStatus: candidate.status,
        event: 'rolled_back',
        at: candidate.rolledBackAt,
        by: candidate.rolledBackBy,
        reason: candidate.rollbackReason ?? undefined,
        runtimeEffective: false,
        rollbackKind,
      });
    }

    return events;
  }

  private async findRequiredCandidate(
    owner: string,
    candidateVersion: string,
  ): Promise<FeedbackAutoReviewPromotionCandidateEntity> {
    const candidate = await this.findCandidate(owner, candidateVersion);

    if (!candidate) {
      throw new NotFoundException('Candidato de promocao nao encontrado.');
    }

    return candidate;
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

  /**
   * Dispara shadow da amostra afetada; falha do shadow não reverte apply/rollback.
   */
  private async runSampleShadowRevaluation(
    candidate: FeedbackAutoReviewPromotionCandidateEntity,
    trigger: AutoReviewSampleRevaluationTrigger,
  ): Promise<void> {
    try {
      const result = await this._shadowService.revaluateAffectedSample({
        owner: candidate.owner,
        candidateVersion: candidate.candidateVersion,
        trigger,
        examples: candidate.evidence?.examples ?? [],
      });

      candidate.notes = this.mergeNotes(
        candidate.notes,
        `sampleShadow=${trigger};version=${result.reviewVersion};evaluated=${result.evaluated};skipped=${result.skipped};errors=${result.errors}`,
      );
      await this._candidateRepository.save(candidate);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown_sample_shadow_error';
      this._logger.error(
        `Sample shadow revaluation failed trigger=${trigger} candidate=${candidate.candidateVersion}: ${message}`,
      );
      candidate.notes = this.mergeNotes(
        candidate.notes,
        `sampleShadow=${trigger};error=${message}`,
      );
      await this._candidateRepository.save(candidate);
    }
  }

  private mergeNotes(current?: string | null, next?: string): string | null {
    if (!next) {
      return current ?? null;
    }

    if (!current) {
      return next;
    }

    return `${current}\n${next}`;
  }
}
