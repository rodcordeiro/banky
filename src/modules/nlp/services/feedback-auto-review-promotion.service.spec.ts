import { BadRequestException } from '@nestjs/common';
import { FeedbackAutoReviewPromotionCandidateEntity } from '../entities/feedback-auto-review-promotion-candidate.entity';
import {
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionStatus,
} from '../interfaces';
import { FeedbackAutoReviewPromotionService } from './feedback-auto-review-promotion.service';

describe('FeedbackAutoReviewPromotionService', () => {
  const candidateRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
  };
  const qualityService = {
    buildQualityMetrics: jest.fn(),
  };
  const effectiveAliasService = {
    hasActiveRuntime: jest.fn().mockResolvedValue(false),
    activateFromCandidate: jest.fn(),
    deactivateByCandidateVersion: jest.fn().mockResolvedValue(1),
  };

  const service = new FeedbackAutoReviewPromotionService(
    candidateRepository as never,
    qualityService as never,
    effectiveAliasService as never,
  );

  const buildQuality = () => ({
    generatedAt: '2026-08-08T12:00:00.000Z',
    filters: { valueApprovalLimit: 5000 },
    summary: {
      shadowVolume: 838,
      humanReviewedWithShadow: 838,
      pendingWithShadow: 0,
      autoApplied: 0,
      agreementCount: 795,
      agreementRate: 0.9487,
      potentialFalsePositives: 3,
      potentialFalsePositiveRate: 0.0036,
      guardrailBlocks: 30,
    },
    byMode: [],
    byDecision: [],
    byIntent: [
      {
        intent: 'create',
        shadowVolume: 650,
        humanReviewedWithShadow: 650,
        agreementCount: 608,
        agreementRate: 0.9354,
        potentialFalsePositives: 3,
        potentialFalsePositiveRate: 0.0046,
      },
      {
        intent: 'transfer',
        shadowVolume: 188,
        humanReviewedWithShadow: 188,
        agreementCount: 187,
        agreementRate: 0.9947,
        potentialFalsePositives: 0,
        potentialFalsePositiveRate: 0,
      },
    ],
    byField: [],
    byValueBand: [
      {
        band: 'within_limit',
        shadowVolume: 810,
        humanReviewedWithShadow: 810,
        agreementCount: 795,
        agreementRate: 0.9815,
        potentialFalsePositives: 3,
        potentialFalsePositiveRate: 0.0037,
      },
      {
        band: 'above_limit',
        shadowVolume: 28,
        humanReviewedWithShadow: 28,
        agreementCount: 0,
        agreementRate: 0,
        potentialFalsePositives: 0,
        potentialFalsePositiveRate: 0,
      },
    ],
    guardrailBlocksByCode: [],
    aliasInspectionReadiness: { eligible: false, reasons: [] },
  });

  const buildCandidate = (
    status = AutoReviewPromotionStatus.active,
  ): FeedbackAutoReviewPromotionCandidateEntity =>
    ({
      id: 'candidate-id',
      owner: 'owner-id',
      type: AutoReviewPromotionCandidateType.alias,
      status,
      origin: AutoReviewPromotionCandidateOrigin.aliasSuggestion,
      candidateVersion: 'alias-v1',
      baseReviewVersion: 'auto-review-shadow-v1',
      evidence: {
        sampleSize: 20,
        shadowAgreementRate: 0.98,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        regressionRate: 0,
        fieldMetrics: [],
        fieldDivergences: {},
        examples: [],
      },
      expectedImpact: {
        affectedFields: ['category'],
        operationalSummary: 'Alias recorrente de categoria.',
      },
      knownRisk: {
        level: 'low',
        reasons: [],
      },
      rollbackPlan: {
        strategy: 'Desativar alias promovido.',
        previousVersion: 'auto-review-shadow-v1',
        validation: 'Reprocessar amostra em shadow.',
      },
      createdBy: 'learning-loop',
      createdAt: '2026-06-17T10:00:00.000Z',
      appliedBy: 'operator-id',
      appliedAt: '2026-06-17T10:30:00.000Z',
      notes: null,
    }) as FeedbackAutoReviewPromotionCandidateEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    qualityService.buildQualityMetrics.mockResolvedValue(buildQuality());
    effectiveAliasService.hasActiveRuntime.mockResolvedValue(false);
    effectiveAliasService.deactivateByCandidateVersion.mockResolvedValue(1);
  });

  it('rolls back an active candidate and records audit metadata', async () => {
    const candidate = buildCandidate();
    candidateRepository.findOne.mockResolvedValue(candidate);
    candidateRepository.save.mockImplementation(entity =>
      Promise.resolve(entity),
    );

    await expect(
      service.rollbackCandidate(
        'owner-id',
        'alias-v1',
        'operator-id',
        'regression detected',
        'disabled before runtime activation',
      ),
    ).resolves.toMatchObject({
      status: AutoReviewPromotionStatus.rolledBack,
      rolledBackBy: 'operator-id',
      rollbackReason: '[kind=immediate] regression detected',
      notes: 'rollbackKind=immediate; disabled before runtime activation',
    });

    expect(candidateRepository.findOne).toHaveBeenCalledWith({
      where: {
        owner: 'owner-id',
        candidateVersion: 'alias-v1',
      },
    });
    expect(candidateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AutoReviewPromotionStatus.rolledBack,
        rolledBackBy: 'operator-id',
        rolledBackAt: expect.any(String),
        rollbackReason: '[kind=immediate] regression detected',
      }),
    );
  });

  it('keeps rollback idempotent when the candidate is already rolled back', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.rolledBack);
    candidateRepository.findOne.mockResolvedValue(candidate);

    await expect(
      service.rollbackCandidate(
        'owner-id',
        'alias-v1',
        'operator-id',
        'already handled',
      ),
    ).resolves.toBe(candidate);

    expect(candidateRepository.save).not.toHaveBeenCalled();
  });

  it('requires a rollback reason', async () => {
    candidateRepository.findOne.mockResolvedValue(buildCandidate());

    await expect(
      service.rollbackCandidate('owner-id', 'alias-v1', 'operator-id', '  '),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(candidateRepository.save).not.toHaveBeenCalled();
  });

  it('blocks rollback for candidates that are not active', async () => {
    candidateRepository.findOne.mockResolvedValue(
      buildCandidate(AutoReviewPromotionStatus.approved),
    );

    await expect(
      service.rollbackCandidate(
        'owner-id',
        'alias-v1',
        'operator-id',
        'not active yet',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(candidateRepository.save).not.toHaveBeenCalled();
  });

  it('exposes dedicated promotion history without claiming runtime effect', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.rolledBack);
    candidate.approvedBy = 'approver-id';
    candidate.approvedAt = '2026-06-17T10:15:00.000Z';
    candidate.rolledBackBy = 'operator-id';
    candidate.rolledBackAt = '2026-06-17T11:00:00.000Z';
    candidate.rollbackReason = 'regression detected';
    candidateRepository.find.mockResolvedValue([candidate]);

    const history = await service.buildPromotionHistory('owner-id');

    expect(history.runtimeEffective).toBe(false);
    expect(history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'created',
          candidateVersion: 'alias-v1',
          runtimeEffective: false,
        }),
        expect.objectContaining({
          event: 'approved',
          by: 'approver-id',
          runtimeEffective: false,
        }),
        expect.objectContaining({
          event: 'applied',
          by: 'operator-id',
          runtimeEffective: false,
        }),
        expect.objectContaining({
          event: 'rolled_back',
          by: 'operator-id',
          reason: 'regression detected',
          runtimeEffective: false,
        }),
      ]),
    );
    expect(history.items[0].at >= history.items[1].at).toBe(true);
  });

  it('filters promotion history by candidateVersion and includes rejected events', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.rejected);
    candidate.appliedBy = undefined;
    candidate.appliedAt = undefined;
    candidate.rejectedBy = 'reviewer-id';
    candidate.rejectedAt = '2026-06-17T10:20:00.000Z';
    candidateRepository.findOne.mockResolvedValue(candidate);

    const history = await service.buildPromotionHistory('owner-id', 'alias-v1');

    expect(candidateRepository.findOne).toHaveBeenCalledWith({
      where: {
        owner: 'owner-id',
        candidateVersion: 'alias-v1',
      },
    });
    expect(history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'rejected',
          by: 'reviewer-id',
          runtimeEffective: false,
        }),
      ]),
    );
    expect(history.items.some(item => item.event === 'applied')).toBe(false);
  });

  it('enriches candidate detail with qualitySignals without claiming runtime effect', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.candidate);
    candidate.evidence.shadowAgreementRate = 0;
    candidate.evidence.sampleSize = 12;
    candidate.evidence.examples = [
      {
        originalText: 'swile mercadinho',
        predicted: 'bonus',
        corrected: 'mercearia',
        field: 'category',
      },
    ];
    candidate.notes = 'pattern=swile; predicted=bonus; corrected=mercearia';

    const rejectedPeer = buildCandidate(AutoReviewPromotionStatus.rejected);
    rejectedPeer.candidateVersion = 'alias-v0';
    rejectedPeer.evidence.examples = candidate.evidence.examples;
    rejectedPeer.notes = candidate.notes;
    rejectedPeer.rejectedBy = 'reviewer-id';

    candidateRepository.findOne.mockResolvedValue(candidate);
    candidateRepository.find.mockResolvedValue([candidate, rejectedPeer]);

    const detail = await service.getCandidateEnriched('owner-id', 'alias-v1');

    expect(detail.runtimeEffective).toBe(false);
    expect(detail.candidate.candidateVersion).toBe('alias-v1');
    expect(detail.qualitySignals.coverage.minSamplesMet).toBe(false);
    expect(detail.qualitySignals.coverage.shadowAgreementRate).toBe(0);
    expect(detail.qualitySignals.coverage.excludedHumanExceptions).toContain(
      'above_limit',
    );
    expect(
      detail.qualitySignals.bySegment.find(
        item => item.kind === 'intent' && item.key === 'transfer',
      )?.verdict,
    ).toBe('meets_current');
    expect(
      detail.qualitySignals.bySegment.find(
        item => item.kind === 'value_band' && item.key === 'above_limit',
      )?.verdict,
    ).toBe('excluded_human_exception');
    expect(detail.qualitySignals.conflicts.rejectedSameScope).toEqual([
      expect.objectContaining({ candidateVersion: 'alias-v0' }),
    ]);
    expect(detail.qualitySignals.approverSummary.text.length).toBeGreaterThan(
      0,
    );
    expect(detail.qualitySignals.temporal.driftFlag).toBe('unknown');
    expect(detail.qualitySignals.operationalCost.basis).toBe('unavailable');
    expect(detail.workflow.recommendation).toBeDefined();
    expect(detail.runtimeEffective).toBe(false);
  });

  it('lists candidates with quality preview for the approver queue', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.candidate);
    candidateRepository.find.mockResolvedValue([candidate]);

    const items = await service.listCandidatesEnriched('owner-id');

    expect(items).toHaveLength(1);
    expect(items[0].runtimeEffective).toBe(false);
    expect(items[0].qualityPreview.minSamplesMet).toBe(true);
    expect(items[0].qualityPreview.approverSummary).toContain('alias-v1');
    expect(items[0].qualityPreview.worstSegmentVerdict).toBe('below_current');
    expect(items[0].qualityPreview.hasConflicts).toBe(false);
  });

  it('flags active same-scope conflicts in qualitySignals', async () => {
    const candidate = buildCandidate(AutoReviewPromotionStatus.candidate);
    candidate.candidateVersion = 'alias-v2';
    candidate.evidence.examples = [
      {
        originalText: 'swile',
        predicted: 'bonus',
        corrected: 'mercearia',
        field: 'category',
      },
    ];
    const activePeer = buildCandidate(AutoReviewPromotionStatus.active);
    activePeer.candidateVersion = 'alias-v1';
    activePeer.evidence.examples = candidate.evidence.examples;

    candidateRepository.findOne.mockResolvedValue(candidate);
    candidateRepository.find.mockResolvedValue([candidate, activePeer]);

    const detail = await service.getCandidateEnriched('owner-id', 'alias-v2');

    expect(detail.qualitySignals.conflicts.activeSameScope).toEqual([
      expect.objectContaining({ candidateVersion: 'alias-v1' }),
    ]);
    expect(detail.qualitySignals.conflicts.rejectedSameScope).toEqual([]);
  });
});
