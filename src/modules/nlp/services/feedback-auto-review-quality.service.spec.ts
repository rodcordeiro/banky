import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReasonSeverity,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewQualityService } from './feedback-auto-review-quality.service';

describe('FeedbackAutoReviewQualityService', () => {
  const feedbackRepository = {
    createQueryBuilder: jest.fn(),
  };
  const historyRepository = {
    find: jest.fn(),
  };
  const service = new FeedbackAutoReviewQualityService(
    feedbackRepository as never,
    historyRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds read-only shadow confidence metrics against human review', async () => {
    historyRepository.find.mockResolvedValue([
      {
        feedbackId: 'feedback-1',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        score: 1,
        fieldScores: { account: 1, category: 1, value: 1, date: 1, intent: 1 },
        reasons: [
          {
            code: 'all_fields_valid',
            severity: AutoReviewReasonSeverity.info,
            message: 'ok',
          },
        ],
        reviewVersion: 'auto-review-shadow-v1',
        evaluatedAt: '2026-08-01T10:00:00.000Z',
        applied: false,
      },
      {
        feedbackId: 'feedback-2',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        score: 0.95,
        fieldScores: {
          account: 1,
          category: 0.5,
          value: 1,
          date: 1,
          intent: 1,
        },
        reasons: [
          {
            code: 'entity_not_found',
            severity: AutoReviewReasonSeverity.blocker,
            message: 'missing',
          },
        ],
        reviewVersion: 'auto-review-shadow-v1',
        evaluatedAt: '2026-08-02T10:00:00.000Z',
        applied: false,
      },
      {
        feedbackId: 'feedback-3',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.manualReview,
        score: 0.8,
        fieldScores: { value: 1, intent: 1 },
        reasons: [
          {
            code: 'value_above_limit',
            severity: AutoReviewReasonSeverity.warning,
            message: 'high value',
          },
        ],
        reviewVersion: 'auto-review-shadow-v1',
        evaluatedAt: '2026-08-03T10:00:00.000Z',
        applied: false,
      },
      {
        feedbackId: 'feedback-2',
        owner: 'owner-id',
        mode: AutoReviewMode.automatic,
        decision: AutoReviewDecision.approve,
        score: 0.95,
        fieldScores: {},
        reasons: [],
        reviewVersion: 'auto-review-automatic-v1',
        evaluatedAt: '2026-08-02T11:00:00.000Z',
        applied: true,
      },
    ]);

    const getMany = jest.fn().mockResolvedValue([
      {
        id: 'feedback-1',
        owner: 'owner-id',
        status: FeedbackStatus.validated,
        predictedIntent: 'create',
        predictedValue: 40,
      },
      {
        id: 'feedback-2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        predictedIntent: 'create',
        predictedValue: 50,
        correctedCategory: 'Mercado',
      },
      {
        id: 'feedback-3',
        owner: 'owner-id',
        status: FeedbackStatus.pending,
        predictedIntent: 'transfer',
        predictedValue: 6000,
      },
    ]);
    feedbackRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany,
    });

    const report = await service.buildQualityMetrics('owner-id', {
      valueApprovalLimit: 100,
    });

    expect(historyRepository.find).toHaveBeenCalled();
    expect(report.summary).toMatchObject({
      shadowVolume: 3,
      humanReviewedWithShadow: 2,
      pendingWithShadow: 1,
      autoApplied: 1,
      agreementCount: 1,
      agreementRate: 0.5,
      potentialFalsePositives: 1,
      guardrailBlocks: 2,
    });
    expect(report.byIntent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intent: 'create',
          shadowVolume: 2,
          potentialFalsePositives: 1,
        }),
        expect.objectContaining({
          intent: 'transfer',
          shadowVolume: 1,
        }),
      ]),
    );
    expect(report.byValueBand).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          band: 'within_limit',
          shadowVolume: 2,
        }),
        expect.objectContaining({
          band: 'above_limit',
          shadowVolume: 1,
        }),
      ]),
    );
    expect(report.guardrailBlocksByCode).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'entity_not_found',
          severity: AutoReviewReasonSeverity.blocker,
        }),
        expect.objectContaining({
          code: 'value_above_limit',
          severity: AutoReviewReasonSeverity.warning,
        }),
      ]),
    );
    expect(report.aliasInspectionReadiness.eligible).toBe(false);
    expect(report.aliasInspectionReadiness.reasons.length).toBeGreaterThan(0);
  });

  it('returns empty metrics when there is no history', async () => {
    historyRepository.find.mockResolvedValue([]);

    const report = await service.buildQualityMetrics('owner-id');

    expect(feedbackRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(report.summary.shadowVolume).toBe(0);
    expect(report.byIntent).toEqual([]);
    expect(report.aliasInspectionReadiness.eligible).toBe(false);
  });
});
