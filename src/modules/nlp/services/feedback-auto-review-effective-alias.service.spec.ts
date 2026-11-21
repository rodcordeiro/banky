import { BadRequestException } from '@nestjs/common';
import {
  AutoReviewPromotionCandidateOrigin,
  AutoReviewPromotionCandidateType,
  AutoReviewPromotionStatus,
} from '../interfaces';
import { EffectiveAliasRuntimeStatus } from '../entities/feedback-auto-review-effective-alias.entity';
import { FeedbackAutoReviewEffectiveAliasService } from './feedback-auto-review-effective-alias.service';

describe('FeedbackAutoReviewEffectiveAliasService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const service = new FeedbackAutoReviewEffectiveAliasService(
    repository as never,
  );

  const candidate = {
    type: AutoReviewPromotionCandidateType.alias,
    status: AutoReviewPromotionStatus.approved,
    origin: AutoReviewPromotionCandidateOrigin.aliasSuggestion,
    candidateVersion: 'alias-v1',
    evidence: {
      sampleSize: 20,
      shadowAgreementRate: 0.99,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      regressionRate: 0,
      fieldMetrics: [],
      fieldDivergences: {},
      examples: [
        {
          originalText: 'swile mercadinho',
          predicted: 'bonus',
          corrected: 'mercearia',
          field: 'category',
        },
      ],
    },
    expectedImpact: {
      affectedFields: ['category'],
      operationalSummary: 'alias',
    },
    rollbackPlan: {
      strategy: 'deactivate',
      previousVersion: 'static',
      validation: 'ok',
    },
    notes: 'pattern=swile; predicted=bonus; corrected=mercearia',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activates alias runtime from approved candidate', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation(payload => payload);
    repository.save.mockImplementation(entity =>
      Promise.resolve({ id: 'alias-id', ...entity }),
    );

    const saved = await service.activateFromCandidate(
      'owner-id',
      candidate as never,
      'operator-id',
    );

    expect(saved.runtimeStatus).toBe(EffectiveAliasRuntimeStatus.active);
    expect(saved.pattern).toBe('swile');
    expect(saved.canonicalValue).toBe('mercearia');
    expect(repository.save).toHaveBeenCalled();
  });

  it('blocks conflicting active alias with different canonical', async () => {
    repository.findOne.mockResolvedValue({
      candidateVersion: 'alias-other',
      canonicalValue: 'outra',
      runtimeStatus: EffectiveAliasRuntimeStatus.active,
    });

    await expect(
      service.activateFromCandidate('owner-id', candidate as never, 'op'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates active aliases by candidate version', async () => {
    repository.find.mockResolvedValue([
      {
        candidateVersion: 'alias-v1',
        runtimeStatus: EffectiveAliasRuntimeStatus.active,
      },
    ]);
    repository.save.mockImplementation(rows => Promise.resolve(rows));

    await expect(
      service.deactivateByCandidateVersion(
        'owner-id',
        'alias-v1',
        'op',
        'immediate',
      ),
    ).resolves.toBe(1);
  });
});
