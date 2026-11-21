import { BadRequestException } from '@nestjs/common';
import { AutoReviewPromotionStatus, FeedbackStatus } from '../interfaces';
import { FeedbackAutoReviewAliasSuggestionService } from './feedback-auto-review-alias-suggestion.service';

describe('FeedbackAutoReviewAliasSuggestionService', () => {
  const feedbackRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const candidateRepository = {
    find: jest.fn(),
  };
  const promotionService = {
    storeCandidate: jest.fn(),
  };

  const service = new FeedbackAutoReviewAliasSuggestionService(
    feedbackRepository as never,
    candidateRepository as never,
    promotionService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds alias suggestions from human divergences without runtime effect', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-02T10:00:00.000Z',
      },
      {
        id: 'f3',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Variado',
        updatedAt: '2026-08-03T10:00:00.000Z',
      },
      {
        id: 'f4',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Aluguel',
        updatedAt: '2026-08-04T10:00:00.000Z',
      },
    ]);
    candidateRepository.find.mockResolvedValue([]);

    const report = await service.buildAliasSuggestions('owner-id', 2);

    expect(report.runtimeEffective).toBe(false);
    expect(report.minVolume).toBe(2);
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'category',
          predicted: 'Mercado',
          corrected: 'Servicos de streaming',
          count: 2,
          meetsMinimumVolume: true,
          conflict: false,
        }),
        expect.objectContaining({
          pattern: 'mesmo texto',
          conflict: true,
        }),
      ]),
    );
  });

  it('creates a promotion candidate from an eligible suggestion', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-02T10:00:00.000Z',
      },
    ]);
    candidateRepository.find.mockResolvedValue([]);
    promotionService.storeCandidate.mockResolvedValue({
      candidateVersion: 'alias-suggest-category',
      status: AutoReviewPromotionStatus.candidate,
    });

    const report = await service.buildAliasSuggestions('owner-id', 2);
    const suggestion = report.items[0];

    await expect(
      service.promoteAliasSuggestion('owner-id', 'operator-id', {
        field: suggestion.field,
        pattern: suggestion.pattern,
        predicted: suggestion.predicted,
        corrected: suggestion.corrected,
        minVolume: 2,
      }),
    ).resolves.toMatchObject({
      status: AutoReviewPromotionStatus.candidate,
    });

    expect(promotionService.storeCandidate).toHaveBeenCalledWith(
      'owner-id',
      expect.objectContaining({
        type: 'alias',
        status: AutoReviewPromotionStatus.candidate,
        origin: 'alias_suggestion',
      }),
    );
  });

  it('blocks promoting conflicting or rejected suggestions', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Variado',
        updatedAt: '2026-08-03T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Aluguel',
        updatedAt: '2026-08-04T10:00:00.000Z',
      },
    ]);
    candidateRepository.find.mockResolvedValue([]);

    const report = await service.buildAliasSuggestions('owner-id', 1);
    const conflicting = report.items.find(item => item.conflict);

    await expect(
      service.promoteAliasSuggestion('owner-id', 'operator-id', {
        field: conflicting!.field,
        pattern: conflicting!.pattern,
        predicted: conflicting!.predicted,
        corrected: conflicting!.corrected,
        minVolume: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('promotes eligible suggestions in batch and skips ineligible ones', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-02T10:00:00.000Z',
      },
      {
        id: 'f3',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Variado',
        updatedAt: '2026-08-03T10:00:00.000Z',
      },
      {
        id: 'f4',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'mesmo texto',
        predictedCategory: 'Mercado',
        correctedCategory: 'Aluguel',
        updatedAt: '2026-08-04T10:00:00.000Z',
      },
    ]);
    candidateRepository.find.mockResolvedValue([]);
    promotionService.storeCandidate.mockResolvedValue({
      status: AutoReviewPromotionStatus.candidate,
    });

    const result = await service.promoteEligibleAliasSuggestions({
      owner: 'owner-id',
      minVolume: 2,
    });

    expect(result.runtimeEffective).toBe(false);
    expect(result.promoted).toBe(1);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.errors).toBe(0);
    expect(promotionService.storeCandidate).toHaveBeenCalledTimes(1);
    expect(promotionService.storeCandidate).toHaveBeenCalledWith(
      'owner-id',
      expect.objectContaining({
        createdBy: 'alias-suggestion-cron',
        status: AutoReviewPromotionStatus.candidate,
      }),
    );
  });

  it('skips already promoted suggestions on second cron run', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-02T10:00:00.000Z',
      },
    ]);
    const report = await service.buildAliasSuggestions('owner-id', 2);
    candidateRepository.find.mockResolvedValue([
      {
        candidateVersion: report.items[0].candidateVersion,
        status: AutoReviewPromotionStatus.candidate,
      },
    ]);

    const result = await service.promoteEligibleAliasSuggestions({
      owner: 'owner-id',
      minVolume: 2,
    });

    expect(result.promoted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.items[0].reason).toBe('already_promoted');
    expect(promotionService.storeCandidate).not.toHaveBeenCalled();
  });

  it('skips rolled_back suggestions without re-promoting', async () => {
    feedbackRepository.find.mockResolvedValue([
      {
        id: 'f1',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'f2',
        owner: 'owner-id',
        status: FeedbackStatus.corrected,
        originalText: 'Paguei youtube premium no nubank',
        predictedCategory: 'Mercado',
        correctedCategory: 'Servicos de streaming',
        updatedAt: '2026-08-02T10:00:00.000Z',
      },
    ]);
    candidateRepository.find.mockResolvedValue([]);
    const report = await service.buildAliasSuggestions('owner-id', 2);
    const version = report.items[0].candidateVersion;

    candidateRepository.find.mockImplementation(
      async (options?: { where?: { status?: AutoReviewPromotionStatus } }) => {
        if (options?.where?.status === AutoReviewPromotionStatus.rolledBack) {
          return [
            {
              candidateVersion: version,
              status: AutoReviewPromotionStatus.rolledBack,
            },
          ];
        }
        return [
          {
            candidateVersion: version,
            status: AutoReviewPromotionStatus.rolledBack,
          },
        ];
      },
    );

    const result = await service.promoteEligibleAliasSuggestions({
      owner: 'owner-id',
      minVolume: 2,
    });

    expect(result.promoted).toBe(0);
    expect(
      result.items.some(item => item.reason === 'already_rolled_back'),
    ).toBe(true);
    expect(promotionService.storeCandidate).not.toHaveBeenCalled();
  });
});
