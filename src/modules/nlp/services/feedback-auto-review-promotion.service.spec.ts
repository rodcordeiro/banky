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

  const service = new FeedbackAutoReviewPromotionService(
    candidateRepository as never,
  );

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
      rollbackReason: 'regression detected',
      notes: 'disabled before runtime activation',
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
        rollbackReason: 'regression detected',
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
});
