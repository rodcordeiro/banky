import {
  AutoReviewDecision,
  AutoReviewMode,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewLearningService } from './feedback-auto-review-learning.service';

describe('FeedbackAutoReviewLearningService', () => {
  const feedbackRepository = {
    find: jest.fn(),
  };
  const historyRepository = {
    find: jest.fn(),
  };
  const service = new FeedbackAutoReviewLearningService(
    feedbackRepository as never,
    historyRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a supervised learning loop report from reviewed feedbacks', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'feedback-1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedIntent: 'create',
        predictedAccount: 'Nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        predictedValue: 39.9,
        predictedDate: '2026-06-15T00:00:00.000Z',
      },
      {
        id: 'feedback-2',
        owner: 'owner-id',
        status: FeedbackStatus.validated,
        originalText: 'Paguei mercado no nubank',
        predictedIntent: 'create',
        predictedAccount: 'Nubank',
        predictedCategory: 'Mercado',
        predictedValue: 20,
        predictedDate: '2026-06-15T00:00:00.000Z',
      },
    ]);
    historyRepository.find.mockResolvedValue([
      {
        feedbackId: 'feedback-1',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      },
      {
        feedbackId: 'feedback-2',
        owner: 'owner-id',
        mode: AutoReviewMode.automatic,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-automatic-v1',
        applied: true,
      },
    ]);

    const report = await service.buildLearningLoopReport('owner-id', 10);

    expect(feedbackRepository.find).toHaveBeenCalledWith({
      where: {
        owner: 'owner-id',
        status: expect.anything(),
      },
      order: {
        updatedAt: 'DESC',
      },
    });
    expect(report.dataset).toMatchObject({
      version: 'learning-loop-v1',
      totalReviewedFeedbacks: 2,
      humanReviewedFeedbacks: 1,
      autoAppliedFeedbacks: 1,
      trainingEligibleFeedbacks: 1,
    });
    expect(report.fieldMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'category',
          total: 2,
          matches: 1,
          divergences: 1,
          correctedLabels: 1,
          accuracy: 0.5,
        }),
      ]),
    );
    expect(report.categoryConfusions).toEqual([
      expect.objectContaining({
        predicted: 'Mercado',
        corrected: 'Servicos de streaming',
        count: 1,
      }),
    ]);
    expect(report.divergenceExamples).toEqual([
      expect.objectContaining({
        feedbackId: 'feedback-1',
        field: 'category',
        predicted: 'Mercado',
        corrected: 'Servicos de streaming',
      }),
    ]);
    expect(report.shadowVersionComparisons).toEqual([
      expect.objectContaining({
        reviewVersion: 'auto-review-shadow-v1',
        total: 1,
        matches: 0,
        divergences: 1,
        agreementRate: 0,
      }),
    ]);
    expect(report.inspectionReady).toBe(false);
    expect(report.promotionEvidence).toMatchObject({
      datasetVersion: 'learning-loop-v1',
      sampleSize: 1,
      falsePositiveRate: 1,
      rollbackRequired: true,
    });
    expect(report.promotionReadiness).toEqual(
      expect.objectContaining({
        eligible: false,
      }),
    );
  });

  it('marks promotion readiness eligible only when alias policy metrics pass', async () => {
    const feedbacks = Array.from({ length: 20 }, (_, index) => ({
      id: `feedback-${index + 1}`,
      owner: 'owner-id',
      status: FeedbackStatus.validated,
      originalText: `gasto ${index + 1}`,
      predictedIntent: 'create',
      predictedAccount: 'Nubank',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }));
    feedbackRepository.find.mockResolvedValue(feedbacks);
    historyRepository.find.mockResolvedValue(
      feedbacks.map(feedback => ({
        feedbackId: feedback.id,
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      })),
    );

    const report = await service.buildLearningLoopReport('owner-id');

    expect(report.inspectionReady).toBe(true);
    expect(report.promotionEvidence).toMatchObject({
      sampleSize: 20,
      humanReviewedSampleSize: 20,
      agreementRate: 1,
      falsePositiveRate: 0,
      rollbackRequired: true,
      criteriaApplied: expect.objectContaining({
        minShadowSamples: 20,
        minAgreementRate: 0.98,
        maxFalsePositiveRate: 0,
      }),
    });
    expect(report.promotionEvidence.reviewVersions).toEqual([
      'auto-review-shadow-v1',
    ]);
    expect(report.promotionReadiness.eligible).toBe(true);
    expect(report.promotionReadiness.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('aprovador humano')]),
    );
  });

  it('keeps eligible false when one confirmed false positive exists', async () => {
    const feedbacks = Array.from({ length: 20 }, (_, index) => ({
      id: `feedback-${index + 1}`,
      owner: 'owner-id',
      status: index === 0 ? FeedbackStatus.corrected : FeedbackStatus.validated,
      originalText: `gasto ${index + 1}`,
      predictedIntent: 'create',
      predictedAccount: 'Nubank',
      predictedCategory: 'Mercado',
      correctedCategory: index === 0 ? 'Servicos' : undefined,
      predictedValue: 10,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }));
    feedbackRepository.find.mockResolvedValue(feedbacks);
    historyRepository.find.mockResolvedValue(
      feedbacks.map(feedback => ({
        feedbackId: feedback.id,
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      })),
    );

    const report = await service.buildLearningLoopReport('owner-id');

    expect(report.promotionEvidence.falsePositiveRate).toBeGreaterThan(0);
    expect(report.promotionReadiness.eligible).toBe(false);
  });

  it('excludes auto-applied feedbacks from promotion sample size', async () => {
    const humanFeedbacks = Array.from({ length: 19 }, (_, index) => ({
      id: `feedback-${index + 1}`,
      owner: 'owner-id',
      status: FeedbackStatus.validated,
      originalText: `gasto ${index + 1}`,
      predictedIntent: 'create',
      predictedAccount: 'Nubank',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }));
    const autoApplied = {
      id: 'feedback-auto',
      owner: 'owner-id',
      status: FeedbackStatus.validated,
      originalText: 'gasto auto',
      predictedIntent: 'create',
      predictedAccount: 'Nubank',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-15T00:00:00.000Z',
    };
    feedbackRepository.find.mockResolvedValue([...humanFeedbacks, autoApplied]);
    historyRepository.find.mockResolvedValue([
      ...humanFeedbacks.map(feedback => ({
        feedbackId: feedback.id,
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      })),
      {
        feedbackId: 'feedback-auto',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      },
      {
        feedbackId: 'feedback-auto',
        owner: 'owner-id',
        mode: AutoReviewMode.automatic,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-automatic-v1',
        applied: true,
      },
    ]);

    const report = await service.buildLearningLoopReport('owner-id');

    expect(report.promotionEvidence.sampleSize).toBe(19);
    expect(report.promotionReadiness.eligible).toBe(false);
  });

  it('does not count duplicate shadow rows as extra promotion samples', async () => {
    const feedbacks = Array.from({ length: 20 }, (_, index) => ({
      id: `feedback-${index + 1}`,
      owner: 'owner-id',
      status: FeedbackStatus.validated,
      originalText: `gasto ${index + 1}`,
      predictedIntent: 'create',
      predictedAccount: 'Nubank',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }));
    feedbackRepository.find.mockResolvedValue(feedbacks);
    historyRepository.find.mockResolvedValue([
      ...feedbacks.slice(0, 19).map(feedback => ({
        feedbackId: feedback.id,
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v1',
      })),
      {
        feedbackId: 'feedback-1',
        owner: 'owner-id',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        reviewVersion: 'auto-review-shadow-v2',
      },
    ]);

    const report = await service.buildLearningLoopReport('owner-id');

    expect(report.promotionEvidence.sampleSize).toBe(19);
    expect(report.promotionReadiness.eligible).toBe(false);
  });

  it('returns an empty report when there are no reviewed feedbacks', async () => {
    feedbackRepository.find.mockResolvedValue([]);
    historyRepository.find.mockResolvedValue([]);

    const report = await service.buildLearningLoopReport('owner-id');

    expect(historyRepository.find).not.toHaveBeenCalled();
    expect(report.dataset.totalReviewedFeedbacks).toBe(0);
    expect(report.divergenceExamples).toEqual([]);
    expect(report.categoryConfusions).toEqual([]);
    expect(report.inspectionReady).toBe(false);
    expect(report.promotionEvidence.rollbackRequired).toBe(true);
    expect(report.promotionReadiness.eligible).toBe(false);
    expect(report.promotionReadiness.reasons).toEqual(
      expect.arrayContaining([
        'Nenhum feedback revisado disponivel para aprendizado.',
      ]),
    );
  });
});
