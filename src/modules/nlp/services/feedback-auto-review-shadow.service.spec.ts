import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReasonSeverity,
  AutoReviewResult,
  FeedbackStatus,
} from '../interfaces';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import { FeedbackAutoReviewShadowService } from './feedback-auto-review-shadow.service';
import { NlpService } from './nlp.service';

describe('FeedbackAutoReviewShadowService', () => {
  const feedbackRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const historyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  it('builds an operational report with divergence and human status', async () => {
    const rawRows = [
      {
        feedbackId: 'feedback-id',
        originalText: 'Conta de mercado',
        mode: AutoReviewMode.shadow,
        decision: AutoReviewDecision.approve,
        score: '1',
        reasons: JSON.stringify([
          {
            code: 'all_fields_valid',
            message: 'Feedback aprovado sem divergencias relevantes.',
            severity: 'info',
            field: 'overall',
          },
        ]),
        reviewVersion: 'auto-review-shadow-v1',
        evaluatedAt: '2026-06-15T10:00:00.000Z',
        createdAt: '2026-06-15T10:00:00.000Z',
        humanStatus: FeedbackStatus.pending,
        divergent: '1',
      },
    ];

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
      getCount: jest.fn().mockResolvedValue(1),
    };

    historyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const report = await service.buildOperationalReport('owner-id', {
      page: 1,
      limit: 10,
      sortBy: 'divergence',
      order: 'DESC',
    });

    expect(report.items).toEqual([
      expect.objectContaining({
        feedbackId: 'feedback-id',
        originalText: 'Conta de mercado',
        decision: AutoReviewDecision.approve,
        mode: AutoReviewMode.shadow,
        score: 1,
        humanStatus: FeedbackStatus.pending,
        shadowStatus: FeedbackStatus.validated,
        divergent: true,
      }),
    ]);
    expect(report.meta).toMatchObject({
      currentPage: 1,
      itemCount: 1,
      totalItems: 1,
      hasNext: false,
    });
  });

  it('applies an automatic approval and records applied history', async () => {
    const feedback = {
      id: 'feedback-id',
      owner: 'owner-id',
      status: FeedbackStatus.pending,
      originalText: 'Pagamento normal',
    } as FeedbackEntity;
    const evaluation: AutoReviewResult = {
      decision: AutoReviewDecision.approve,
      mode: AutoReviewMode.automatic,
      score: 1,
      fieldScores: { intent: 1, account: 1, category: 1, value: 1, date: 1 },
      reasons: [
        {
          code: 'all_fields_valid',
          message: 'Feedback aprovado sem divergencias relevantes.',
          severity: AutoReviewReasonSeverity.info,
          field: 'overall',
        },
      ],
      suggestedCorrections: undefined,
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-15T10:00:00.000Z',
    };

    historyRepository.findOne.mockResolvedValue(null);
    historyRepository.create.mockImplementation(value => value);
    historyRepository.merge.mockImplementation((existing, value) => ({
      ...existing,
      ...value,
    }));
    historyRepository.save.mockImplementation(async value => value);
    feedbackRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewDecision(feedback, evaluation),
    ).resolves.toEqual(
      expect.objectContaining({
        status: FeedbackStatus.validated,
      }),
    );

    expect(feedbackRepository.save).toHaveBeenCalledWith({
      ...feedback,
      status: FeedbackStatus.validated,
    });
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackId: feedback.id,
        owner: feedback.owner,
        mode: AutoReviewMode.automatic,
        decision: AutoReviewDecision.approve,
        applied: true,
        reviewVersion: 'auto-review-automatic-v1',
      }),
    );
  });

  it('does not apply an automatic approval twice for the same review version', async () => {
    const feedback = {
      id: 'feedback-id',
      owner: 'owner-id',
      status: FeedbackStatus.pending,
      originalText: 'Pagamento normal',
    } as FeedbackEntity;
    const evaluation: AutoReviewResult = {
      decision: AutoReviewDecision.approve,
      mode: AutoReviewMode.automatic,
      score: 1,
      fieldScores: { intent: 1, account: 1, category: 1, value: 1, date: 1 },
      reasons: [
        {
          code: 'all_fields_valid',
          message: 'Feedback aprovado sem divergencias relevantes.',
          severity: AutoReviewReasonSeverity.info,
          field: 'overall',
        },
      ],
      suggestedCorrections: undefined,
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-15T10:00:00.000Z',
    };

    historyRepository.findOne.mockResolvedValue({ applied: true });

    await expect(
      service.applyAutoReviewDecision(feedback, evaluation),
    ).resolves.toBeNull();

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(historyRepository.save).not.toHaveBeenCalled();
  });

  it('blocks automatic approval when human corrections already exist', async () => {
    const feedback = {
      id: 'feedback-id',
      owner: 'owner-id',
      status: FeedbackStatus.pending,
      correctedAccount: 'Conta Humana',
      originalText: 'Pagamento normal',
    } as FeedbackEntity;
    const evaluation: AutoReviewResult = {
      decision: AutoReviewDecision.approve,
      mode: AutoReviewMode.automatic,
      score: 1,
      fieldScores: { intent: 1, account: 1, category: 1, value: 1, date: 1 },
      reasons: [
        {
          code: 'all_fields_valid',
          message: 'Feedback aprovado sem divergencias relevantes.',
          severity: AutoReviewReasonSeverity.info,
          field: 'overall',
        },
      ],
      suggestedCorrections: undefined,
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-15T10:00:00.000Z',
    };

    await expect(
      service.applyAutoReviewDecision(feedback, evaluation),
    ).resolves.toBeNull();

    expect(historyRepository.findOne).not.toHaveBeenCalled();
    expect(feedbackRepository.save).not.toHaveBeenCalled();
  });
});
