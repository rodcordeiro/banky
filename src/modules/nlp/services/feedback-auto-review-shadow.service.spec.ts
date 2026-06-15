import {
  AutoReviewDecision,
  AutoReviewMode,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackAutoReviewShadowService } from './feedback-auto-review-shadow.service';
import { NlpService } from './nlp.service';

describe('FeedbackAutoReviewShadowService', () => {
  const feedbackRepository = {
    find: jest.fn(),
  };

  const historyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const nlpService = {
    evaluateFeedbackAutoReview: jest.fn(),
  };

  const service = new FeedbackAutoReviewShadowService(
    feedbackRepository as never,
    historyRepository as never,
    nlpService as unknown as NlpService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a shadow evaluation for pending feedback', async () => {
    const feedback = {
      id: 'feedback-id',
      owner: 'owner-id',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.approve,
      mode: AutoReviewMode.shadow,
      score: 1,
      fieldScores: { intent: 1 },
      reasons: [],
      reviewVersion: 'auto-review-shadow-v1',
      evaluatedAt: '2026-06-15T10:00:00.000Z',
    };

    feedbackRepository.find.mockResolvedValue([feedback]);
    historyRepository.findOne.mockResolvedValue(null);
    const persisted = {
      id: 'history-id',
      feedbackId: feedback.id,
      owner: feedback.owner,
      mode: AutoReviewMode.shadow,
      decision: AutoReviewDecision.approve,
      score: 1,
      fieldScores: { intent: 1 },
      reasons: [],
      suggestedCorrections: null,
      reviewVersion: 'auto-review-shadow-v1',
      evaluatedAt: '2026-06-15T10:00:00.000Z',
    } as FeedbackAutoReviewEntity;
    historyRepository.create.mockReturnValue(persisted);
    historyRepository.save.mockResolvedValue(persisted);
    nlpService.evaluateFeedbackAutoReview.mockResolvedValue(evaluation);

    await expect(service.processShadowBatch()).resolves.toBe(1);

    expect(feedbackRepository.find).toHaveBeenCalledWith({
      where: { status: FeedbackStatus.pending },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    expect(nlpService.evaluateFeedbackAutoReview).toHaveBeenCalledWith(
      feedback,
      feedback.owner,
      {
        mode: AutoReviewMode.shadow,
        reviewVersion: 'auto-review-shadow-v1',
      },
    );
    expect(historyRepository.save).toHaveBeenCalledWith(persisted);
  });

  it('skips feedback already evaluated in shadow mode', async () => {
    const feedback = {
      id: 'feedback-id',
      owner: 'owner-id',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;

    feedbackRepository.find.mockResolvedValue([feedback]);
    historyRepository.findOne.mockResolvedValue({
      id: 'history-id',
      feedbackId: feedback.id,
    });

    await expect(service.processShadowBatch()).resolves.toBe(0);

    expect(nlpService.evaluateFeedbackAutoReview).not.toHaveBeenCalled();
    expect(historyRepository.save).not.toHaveBeenCalled();
  });
});
