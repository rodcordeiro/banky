import { FeedbackEntity } from '../entities/feedback.entity';
import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReasonSeverity,
} from '../interfaces';
import { FeedbackAutoReviewService } from './feedback-auto-review.service';

describe('FeedbackAutoReviewService', () => {
  const service = new FeedbackAutoReviewService();

  const validCreateFeedback = () =>
    ({
      predictedIntent: 'create',
      predictedAccount: 'Nubank Digo',
      predictedCategory: 'Mercado',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }) as FeedbackEntity;

  const validTransferFeedback = () =>
    ({
      predictedIntent: 'transfer',
      predictedOriginAccount: 'Santander',
      predictedDestinyAccount: 'Nubank yah',
      predictedValue: 30,
      predictedDate: '2026-06-15T00:00:00.000Z',
    }) as FeedbackEntity;

  it('approves a valid create feedback with known owner entities', () => {
    const result = service.evaluate(validCreateFeedback(), {
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
    expect(result.score).toBe(1);
  });

  it('rejects create feedback without account', () => {
    const feedback = {
      predictedIntent: 'create',
      predictedCategory: 'Mercado',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'nubank digo' }],
      ownerCategories: [{ name: 'mercado' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_account',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
  });

  it('rejects create feedback without category', () => {
    const feedback = {
      predictedIntent: 'create',
      predictedAccount: 'Nubank Digo',
      predictedValue: 120.39,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'nubank digo' }],
      ownerCategories: [{ name: 'mercado' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_category',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
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
    expect(result.fieldScores).toMatchObject({
      intent: 1,
      account: 1,
      category: 1,
      value: 1,
      date: 1,
    });
    expect(result.score).toBe(1);
  });

  it('approves a valid transfer feedback with known owner entities', () => {
    const result = service.evaluate(validTransferFeedback(), {
      ownerAccounts: [{ name: 'santander' }, { name: 'nubank yah' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.approve);
    expect(result.reasons).toHaveLength(0);
    expect(result.fieldScores).toMatchObject({
      intent: 1,
      originAccount: 1,
      destinyAccount: 1,
      value: 1,
      date: 1,
    });
    expect(result.score).toBe(1);
  });

  it('rejects transfer feedback without origin account', () => {
    const feedback = {
      predictedIntent: 'transfer',
      predictedDestinyAccount: 'Nubank yah',
      predictedValue: 30,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'santander' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_origin_account',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
  });

  it('rejects transfer feedback without destiny account', () => {
    const feedback = {
      predictedIntent: 'transfer',
      predictedOriginAccount: 'Santander',
      predictedValue: 30,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'santander' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_destiny_account',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
  });

  it('rejects transfer feedback when origin and destiny are equal', () => {
    const feedback = {
      predictedIntent: 'transfer',
      predictedOriginAccount: 'Santander',
      predictedDestinyAccount: 'santander',
      predictedValue: 30,
      predictedDate: '2026-06-15T00:00:00.000Z',
    } as FeedbackEntity;

    const result = service.evaluate(feedback, {
      ownerAccounts: [{ name: 'santander' }],
    });

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'same_transfer_accounts',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['non numeric', Number.NaN],
  ])('rejects feedback with %s value', (_, value) => {
    const result = service.evaluate(
      {
        predictedIntent: 'create',
        predictedAccount: 'Nubank Digo',
        predictedCategory: 'Mercado',
        predictedValue: value,
        predictedDate: '2026-06-15T00:00:00.000Z',
      } as FeedbackEntity,
      {
        ownerAccounts: [{ name: 'nubank digo' }],
        ownerCategories: [{ name: 'mercado' }],
      },
    );

    expect(result.decision).toBe(AutoReviewDecision.reject);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_value',
          severity: AutoReviewReasonSeverity.blocker,
        }),
      ]),
    );
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
    expect(result.fieldScores).toMatchObject({
      intent: 1,
      account: 0.5,
      category: 0.5,
      value: 1,
      date: 1,
    });
    expect(result.score).toBeCloseTo(0.8, 4);
  });
});
