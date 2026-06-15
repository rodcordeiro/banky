import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReasonSeverity,
} from '../interfaces';
import { FeedbackAutoReviewService } from './feedback-auto-review.service';

describe('FeedbackAutoReviewService', () => {
  const service = new FeedbackAutoReviewService();

  it('approves a valid create feedback with known owner entities', () => {
    const feedback = {
      predictedIntent: 'create',
      predictedAccount: 'Nubank Digo',
      predictedCategory: 'Mercado',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'nubank digo' }],
      ownerCategories: [{ name: 'mercado' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.approve);
    expect(result.mode).toBe(AutoReviewMode.shadow);
    expect(result.reasons).toHaveLength(0);
    expect(result.fieldScores).toMatchObject({
      intent: 1,
      account: 1,
      category: 1,
      value: 1,
      date: 1,
    });
  });

  it('marks feedback as correct when explicit corrections are present and valid', () => {
    const feedback = {
      predictedIntent: 'create',
      correctedAccount: 'Nubank Yah',
      predictedCategory: 'Mercado',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'nubank yah' }],
      ownerCategories: [{ name: 'mercado' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.correct);
    expect(result.suggestedCorrections).toEqual({
      account: 'Nubank Yah',
    });
  });

  it('rejects feedback with an unsupported intent', () => {
    const feedback = {
      predictedIntent: 'sell',
      predictedAccount: 'Nubank Digo',
      predictedCategory: 'Mercado',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback);

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual([
      expect.objectContaining({
        code: 'unknown_intent',
        severity: AutoReviewReasonSeverity.blocker,
      }),
    ]);
  });

  it('returns manual review when the owner entity cannot be resolved', () => {
    const feedback = {
      predictedIntent: 'create',
      predictedAccount: 'Conta Externa',
      predictedCategory: 'Categoria Externa',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'nubank digo' }],
      ownerCategories: [{ name: 'mercado' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.manualReview);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'entity_not_found',
          severity: AutoReviewReasonSeverity.warning,
        }),
      ]),
    );
  });
});
