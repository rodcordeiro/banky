import {
  AUTO_REVIEW_PROMOTION_POLICY,
  AUTO_REVIEW_PROMOTION_POLICY_VERSION,
  AutoReviewPromotionCandidateType,
} from '../interfaces';
import { FeedbackAutoReviewPromotionPolicyReassessmentService } from './feedback-auto-review-promotion-policy-reassessment.service';

describe('FeedbackAutoReviewPromotionPolicyReassessmentService', () => {
  const qualityService = {
    buildQualityMetrics: jest.fn(),
  };
  const service = new FeedbackAutoReviewPromotionPolicyReassessmentService(
    qualityService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('proposes segment criteria without applying policy or enabling auto-promotion', async () => {
    qualityService.buildQualityMetrics.mockResolvedValue({
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

    const result = await service.buildReassessment('owner-id');
    const aliasCriteria =
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ];

    expect(result.policyVersion).toBe(AUTO_REVIEW_PROMOTION_POLICY_VERSION);
    expect(result.runtimeEffective).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.proposedCriteria.allowsAutoPromotion).toBe(false);
    expect(result.proposedCriteria.keepGlobalCriteria).toBe(true);
    expect(result.currentCriteria).toEqual(aliasCriteria);
    expect(result.observed.globalRaw.eligible).toBe(false);
    expect(result.observed.globalForEligibility.eligible).toBe(false);
    expect(result.observed.globalForEligibility.blockers).toContain(
      'false_positive_regression',
    );
    expect(
      result.observed.byIntent.find(item => item.key === 'transfer')?.vsCurrent,
    ).toBe('meets_current');
    expect(
      result.observed.byValueBand.find(item => item.key === 'above_limit')
        ?.vsCurrent,
    ).toBe('excluded_human_exception');
    expect(result.humanExceptions.map(item => item.code)).toContain(
      'above_limit_excluded',
    );
    expect(result.proposedCriteria.bySegment.map(item => item.key)).toEqual(
      expect.arrayContaining([
        'transfer',
        'create',
        'within_limit',
        'above_limit',
      ]),
    );
    expect(
      result.observed.byIntent.find(item => item.key === 'create')?.vsCurrent,
    ).toBe('below_current');
    const withinProposal = result.proposedCriteria.bySegment.find(
      item => item.key === 'within_limit',
    );
    expect(withinProposal?.action).toBe('document_only');
    expect(withinProposal?.proposedCriteria?.maxFalsePositiveRate).toBe(0.0037);
    expect(result.recommendations.map(item => item.code)).toEqual(
      expect.arrayContaining([
        'do_not_enable_auto_promotion',
        'await_alias_runtime',
        'observe_segment_transfer',
        'keep_create_restrictive',
        'exclude_above_limit_from_quality',
      ]),
    );
    expect(
      AUTO_REVIEW_PROMOTION_POLICY.criteriaByType[
        AutoReviewPromotionCandidateType.alias
      ].maxFalsePositiveRate,
    ).toBe(0);
  });
});
