import {
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionStatus,
} from '../interfaces';
import { FeedbackAutoReviewComparativeReplayService } from './feedback-auto-review-comparative-replay.service';

describe('FeedbackAutoReviewComparativeReplayService', () => {
  const promotionService = {
    getCandidate: jest.fn(),
  };
  const qualityService = {
    buildQualityMetrics: jest.fn(),
  };
  const service = new FeedbackAutoReviewComparativeReplayService(
    promotionService as never,
    qualityService as never,
  );

  const buildQuality = (overrides?: {
    agreementRate?: number;
    falsePositiveRate?: number;
    humanReviewedWithShadow?: number;
  }) => ({
    generatedAt: '2026-08-08T12:00:00.000Z',
    filters: { valueApprovalLimit: 5000 },
    summary: {
      shadowVolume: overrides?.humanReviewedWithShadow ?? 838,
      humanReviewedWithShadow: overrides?.humanReviewedWithShadow ?? 838,
      pendingWithShadow: 0,
      autoApplied: 0,
      agreementCount: 795,
      agreementRate: overrides?.agreementRate ?? 0.9487,
      potentialFalsePositives: 3,
      potentialFalsePositiveRate: overrides?.falsePositiveRate ?? 0.0036,
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

  const buildCandidate = (overrides: Record<string, unknown> = {}) => ({
    type: AutoReviewPromotionCandidateType.alias,
    status: AutoReviewPromotionStatus.candidate,
    origin: AutoReviewPromotionCandidateOrigin.aliasSuggestion,
    candidateVersion: 'alias-v1',
    baseReviewVersion: 'auto-review-shadow-v1',
    evidence: {
      sampleSize: 12,
      shadowAgreementRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      regressionRate: 0,
      fieldMetrics: [],
      fieldDivergences: { category: 12 },
      examples: [],
    },
    expectedImpact: {
      affectedFields: ['category'],
      operationalSummary: 'Alias sugerido.',
    },
    knownRisk: { level: 'medium', reasons: [] },
    rollbackPlan: {
      strategy: 'rollback ciclo',
      previousVersion: 'static',
      validation: 'runtimeEffective=false',
    },
    createdBy: 'owner-id',
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    promotionService.getCandidate.mockResolvedValue(buildCandidate());
    qualityService.buildQualityMetrics.mockResolvedValue(buildQuality());
  });

  it('builds comparative replay recommending reduce_scope when transfer ok and create weak', async () => {
    const report = await service.buildComparativeReplay('owner-id', 'alias-v1');

    expect(report.runtimeEffective).toBe(false);
    expect(report.global.gates.eligible).toBe(false);
    expect(report.recommendation.action).not.toBe('promote');
    expect(report.recommendation.action).toBe('reduce_scope');
    expect(
      report.bySegment.find(
        item => item.kind === 'intent' && item.key === 'transfer',
      )?.current.verdict,
    ).toBe('meets_current');
    expect(
      report.bySegment.find(
        item => item.kind === 'intent' && item.key === 'create',
      )?.hiddenRegression,
    ).toBe(true);
    expect(
      report.bySegment.find(
        item => item.kind === 'value_band' && item.key === 'above_limit',
      )?.current.verdict,
    ).toBe('excluded_human_exception');
    expect(report.falsePositivesByValueBand.map(item => item.key)).toEqual(
      expect.arrayContaining(['within_limit', 'above_limit']),
    );
    expect(report.operationalGain.basis).toBe('unavailable');
    expect(['temporal', 'stub']).toContain(report.sampleSplit.mode);
  });

  it('marks rejected reprocess as deferred when evidence is not obvious', async () => {
    promotionService.getCandidate.mockResolvedValue(
      buildCandidate({
        status: AutoReviewPromotionStatus.rejected,
        rejectedAt: '2026-08-07T10:00:00.000Z',
        evidence: {
          sampleSize: 900,
          shadowAgreementRate: 0,
          falsePositiveRate: 0,
          falseNegativeRate: 0,
          regressionRate: 0,
          fieldMetrics: [],
          fieldDivergences: { category: 900 },
          examples: [],
        },
      }),
    );

    const report = await service.buildComparativeReplay('owner-id', 'alias-v1');

    expect(report.rejectedReprocess.eligibleForReprocess).toBeNull();
    expect(report.rejectedReprocess.reason).toMatch(
      /não reprocessar|deferred|óbvia/i,
    );
  });
});
