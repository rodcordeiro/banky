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
    expect(report.promotionReadiness).toEqual(
      expect.objectContaining({
        eligible: false,
      }),
    );
  });

  it('returns an empty report when there are no reviewed feedbacks', async () => {
    feedbackRepository.find.mockResolvedValue([]);
    historyRepository.find.mockResolvedValue([]);

    const report = await service.buildLearningLoopReport('owner-id');

    expect(historyRepository.find).not.toHaveBeenCalled();
    expect(report.dataset.totalReviewedFeedbacks).toBe(0);
    expect(report.divergenceExamples).toEqual([]);
    expect(report.categoryConfusions).toEqual([]);
    expect(report.promotionReadiness.reasons).toEqual(
      expect.arrayContaining([
        'Nenhum feedback revisado disponivel para aprendizado.',
      ]),
    );
  });
});
