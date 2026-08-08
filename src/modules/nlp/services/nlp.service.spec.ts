import { AccountsClassifier } from '../classifiers/account.classifier';
import { CategoryClassifier } from '../classifiers/category.classifier';
import { IntentClassifier, Intents } from '../classifiers/intent.classifier';
import { FeedbackEntity } from '../entities/feedback.entity';
import { ValueClassifier } from '../classifiers/value.classifier';
import {
  AutoReviewDecision,
  AutoReviewMode,
  AutoReviewReasonCode,
  FeedbackStatus,
} from '../interfaces';
import { ACCOUNT_ALIASES, CATEGORY_ALIASES } from '../utils/alias.rules';
import { NlpService } from './nlp.service';

const owner = '1c48d2bf-2d52-4764-98df-d81be158b01b';

const accounts = [
  { id: 'account-nubank-digo', name: 'nubank digo' },
  { id: 'account-nubank-yah', name: 'Nubank yah' },
  { id: 'account-credito-yah', name: 'Crédito yah' },
  { id: 'account-credito-digo', name: 'Crédito digo' },
  { id: 'account-santander', name: 'santander' },
  { id: 'account-mercado-pago', name: 'mercado pago' },
  { id: 'account-nubank-nick', name: 'nubank nick' },
  { id: 'account-c6', name: 'c6' },
];

const categories = [
  { id: 'category-magic', name: 'Magic' },
  { id: 'category-mercado', name: 'Mercado' },
  { id: 'category-streaming', name: 'Serviços de streaming' },
  { id: 'category-internet', name: 'Serviço de Internet' },
  { id: 'category-farmacia', name: 'Farmácia' },
  { id: 'category-bilhete-unico', name: 'Bilhete único' },
  { id: 'category-taxa', name: 'Taxa de serviço' },
  { id: 'category-aluguel', name: 'Aluguel' },
  { id: 'category-agua', name: 'Água e esgoto' },
  { id: 'category-luz', name: 'Luz' },
  { id: 'category-almoco', name: 'Almoço' },
  { id: 'category-smartbreak', name: 'Smartbreak' },
  { id: 'category-emprestimo', name: 'Parcela de Empréstimo' },
  { id: 'category-variado', name: 'Variado' },
];

const valuesByText = new Map<string, number>([
  ['43.40 do booster de Magic na Nubank yah crédito dia 09/10', 43.4],
  ['Na conta santander, dia 14/11, 120.39 de Mercado', 120.39],
  ['Na conta Mercado Pago, dia 29/09, 53.9 do yt premium', 53.9],
  ['Na conta Nubank digo, dia 09/11, 60 de troca da bateria dos relógios', 60],
  ['Na conta santander, dia 13/10, transferi 30 para o nubank yah', 30],
]);

describe('NlpService classifier orchestration', () => {
  const feedbackRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const accountRepository = {
    find: jest.fn(),
  };
  const categoryRepository = {
    find: jest.fn(),
  };
  const feedbackAutoReviewRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
  };
  const paginateService = {
    paginate: jest.fn(),
  };
  const transactionsService = {
    store: jest.fn(),
    createTransfer: jest.fn(),
  };
  const feedbackAutoReviewService = {
    evaluate: jest.fn(),
  };

  let service: NlpService;

  beforeEach(() => {
    accountRepository.find.mockResolvedValue(accounts);
    categoryRepository.find.mockResolvedValue(categories);

    jest
      .spyOn(IntentClassifier.prototype, 'classify')
      .mockImplementation(async text =>
        text.includes('transferi') ? Intents.TRANSFER : Intents.CREATE,
      );
    jest.spyOn(AccountsClassifier.prototype, 'classify').mockResolvedValue('');
    jest.spyOn(CategoryClassifier.prototype, 'classify').mockResolvedValue('');
    jest
      .spyOn(ValueClassifier.prototype, 'classify')
      .mockImplementation(async text => valuesByText.get(text) ?? null);

    service = new NlpService(
      feedbackRepository as never,
      accountRepository as never,
      categoryRepository as never,
      feedbackAutoReviewRepository as never,
      paginateService as never,
      transactionsService as never,
      feedbackAutoReviewService as never,
      {
        resolveAliasRules: jest
          .fn()
          .mockImplementation((_owner, field) =>
            Promise.resolve(
              field === 'account' ? ACCOUNT_ALIASES : CATEGORY_ALIASES,
            ),
          ),
        listReport: jest.fn(),
        hasActiveRuntime: jest.fn().mockResolvedValue(false),
      } as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('resolves credit account alias before falling back to account classifier', async () => {
    const result = await service.extractEntities(
      '43.40 do booster de Magic na Nubank yah crédito dia 09/10',
      owner,
    );

    expect(result.predictedIntent).toBe(Intents.CREATE);
    expect(result.predictedAccount).toBe('Crédito yah');
    expect(result.predictedCategory).toBe('Magic');
    expect(result.predictedValue).toBe(43.4);
    expect(AccountsClassifier.prototype.classify).not.toHaveBeenCalled();
    expect(accountRepository.find).toHaveBeenCalledWith({
      where: { owner: { id: owner } },
    });
  });

  it('extracts explicit account instead of confusing category terms with account', async () => {
    const result = await service.extractEntities(
      'Na conta santander, dia 14/11, 120.39 de Mercado',
      owner,
    );

    expect(result.predictedAccount).toBe('santander');
    expect(result.predictedCategory).toBe('Mercado');
    expect(result.predictedValue).toBe(120.39);
    expect(AccountsClassifier.prototype.classify).not.toHaveBeenCalled();
  });

  it('maps yt premium aliases to streaming category', async () => {
    const result = await service.extractEntities(
      'Na conta Mercado Pago, dia 29/09, 53.9 do yt premium',
      owner,
    );

    expect(result.predictedAccount).toBe('mercado pago');
    expect(result.predictedCategory).toBe('Serviços de streaming');
    expect(result.predictedValue).toBe(53.9);
    expect(CategoryClassifier.prototype.classify).not.toHaveBeenCalled();
  });

  it('maps battery maintenance phrase to existing varied category', async () => {
    const result = await service.extractEntities(
      'Na conta Nubank digo, dia 09/11, 60 de troca da bateria dos relógios',
      owner,
    );

    expect(result.predictedAccount).toBe('nubank digo');
    expect(result.predictedCategory).toBe('Variado');
    expect(result.predictedValue).toBe(60);
    expect(CategoryClassifier.prototype.classify).not.toHaveBeenCalled();
  });

  it('resolves transfer origin and destiny accounts from explicit chunks', async () => {
    const result = await service.extractEntities(
      'Na conta santander, dia 13/10, transferi 30 para o nubank yah',
      owner,
    );

    expect(result.predictedIntent).toBe(Intents.TRANSFER);
    expect(result.predictedOriginAccount).toBe('santander');
    expect(result.predictedDestinyAccount).toBe('Nubank yah');
    expect(result.predictedValue).toBe(30);
    expect(AccountsClassifier.prototype.classify).not.toHaveBeenCalled();
  });

  it('creates a regular transaction from corrected feedback data', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      originalText: 'Mercado no santander',
      predictedIntent: Intents.CREATE,
      predictedAccount: 'mercado pago',
      correctedAccount: 'santander',
      predictedCategory: 'Serviços de casa',
      correctedCategory: 'Mercado',
      predictedValue: 10,
      correctedValue: 120.39,
      predictedDate: '2026-06-10T00:00:00.000Z',
      correctedDate: '2026-06-12T00:00:00.000Z',
    };
    const transaction = { id: 'transaction-id' };
    feedbackRepository.findOne.mockResolvedValue(feedback);
    transactionsService.store.mockResolvedValue(transaction);

    await expect(
      service.createTransactionFromFeedback('feedback-id', owner),
    ).resolves.toBe(transaction);

    expect(feedbackRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'feedback-id', owner },
    });
    expect(transactionsService.store).toHaveBeenCalledWith({
      description: feedback.originalText,
      account: 'account-santander',
      category: 'category-mercado',
      value: 120.39,
      date: '2026-06-12T00:00:00.000Z',
      owner,
    });
  });

  it('creates transfer transactions from transfer feedback data', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      originalText: 'Transferi 30 do santander para nubank yah',
      predictedIntent: Intents.TRANSFER,
      predictedOriginAccount: 'santander',
      predictedDestinyAccount: 'nubank yah',
      predictedCategory: 'transferencia',
      predictedValue: 30,
      predictedDate: '2026-06-12T00:00:00.000Z',
    };
    feedbackRepository.findOne.mockResolvedValue(feedback);
    transactionsService.createTransfer.mockResolvedValue(undefined);

    await expect(
      service.createTransactionFromFeedback('feedback-id', owner),
    ).resolves.toEqual({
      type: Intents.TRANSFER,
      feedbackId: 'feedback-id',
    });

    expect(transactionsService.createTransfer).toHaveBeenCalledWith({
      description: feedback.originalText,
      origin: 'account-santander',
      destiny: 'account-nubank-yah',
      value: 30,
      date: '2026-06-12T00:00:00.000Z',
      owner,
    });
  });

  it('throws when feedback does not exist for owner', async () => {
    feedbackRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTransactionFromFeedback('missing-id', owner),
    ).rejects.toThrow('Feedback nao encontrado.');

    expect(transactionsService.store).not.toHaveBeenCalled();
    expect(transactionsService.createTransfer).not.toHaveBeenCalled();
  });

  it('throws when feedback account or category cannot be resolved', async () => {
    feedbackRepository.findOne.mockResolvedValue({
      id: 'feedback-id',
      owner,
      originalText: 'Texto sem conta conhecida',
      predictedIntent: Intents.CREATE,
      predictedAccount: 'conta inexistente',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-12T00:00:00.000Z',
    });

    await expect(
      service.createTransactionFromFeedback('feedback-id', owner),
    ).rejects.toThrow('Conta ou categoria nao encontrada para o feedback.');

    expect(transactionsService.store).not.toHaveBeenCalled();
  });

  it('loads owner entities once when evaluating auto review', async () => {
    const feedback = {
      predictedIntent: Intents.CREATE,
      predictedAccount: 'nubank digo',
      predictedCategory: 'Mercado',
      predictedValue: 10,
      predictedDate: '2026-06-12T00:00:00.000Z',
    } as FeedbackEntity;
    const evaluation = { decision: 'approve' };
    feedbackAutoReviewService.evaluate.mockResolvedValue(evaluation);

    await expect(
      service.evaluateFeedbackAutoReview(feedback, owner),
    ).resolves.toBe(evaluation);

    expect(accountRepository.find).toHaveBeenCalledTimes(1);
    expect(categoryRepository.find).toHaveBeenCalledTimes(1);
    expect(feedbackAutoReviewService.evaluate).toHaveBeenCalledWith(feedback, {
      valueApprovalLimit: 5000,
      mode: AutoReviewMode.assistive,
      ownerAccounts: accounts.map(({ name }) => ({ name })),
      ownerCategories: categories.map(({ name }) => ({ name })),
      accountAliases: ACCOUNT_ALIASES,
      categoryAliases: CATEGORY_ALIASES,
    });
  });

  it('applies automatic category correction when entity exists and no alias conflict', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      originalText: 'Na conta santander, dia 14/11, 120.39 de Mercado',
      predictedIntent: Intents.CREATE,
      predictedAccount: 'santander',
      predictedCategory: 'Variado',
      predictedValue: 120.39,
      predictedDate: '2026-06-12T00:00:00.000Z',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: { category: 1 },
      reasons: [],
      suggestedCorrections: {
        category: 'Mercado',
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };
    const corrected = {
      ...feedback,
      correctedCategory: 'Mercado',
      status: FeedbackStatus.corrected,
    };
    const history = { id: 'history-id' };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackRepository.create.mockReturnValue(corrected);
    feedbackRepository.save.mockResolvedValue(corrected);
    feedbackAutoReviewRepository.create.mockReturnValue(history);
    feedbackAutoReviewRepository.save.mockResolvedValue(history);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).resolves.toBe(corrected);

    expect(feedbackRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        correctedCategory: 'Mercado',
        status: FeedbackStatus.corrected,
      }),
    );
    expect(feedbackAutoReviewRepository.save).toHaveBeenCalledWith(history);
    expect(transactionsService.store).not.toHaveBeenCalled();
    expect(transactionsService.createTransfer).not.toHaveBeenCalled();
  });

  it('applies automatic account correction when entity exists', async () => {
    const feedback = {
      id: 'feedback-account',
      owner,
      originalText: 'compra na conta santander',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: { account: 1 },
      reasons: [],
      suggestedCorrections: { account: 'santander' },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };
    const corrected = {
      ...feedback,
      correctedAccount: 'santander',
      status: FeedbackStatus.corrected,
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackRepository.create.mockReturnValue(corrected);
    feedbackRepository.save.mockResolvedValue(corrected);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).resolves.toBe(corrected);

    expect(feedbackRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        correctedAccount: 'santander',
        status: FeedbackStatus.corrected,
      }),
    );
  });

  it('applies automatic value correction when value is finite and positive', async () => {
    const feedback = {
      id: 'feedback-value',
      owner,
      originalText: 'compra 120.39',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: { value: 1 },
      reasons: [],
      suggestedCorrections: { value: 120.39 },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };
    const corrected = {
      ...feedback,
      correctedValue: 120.39,
      status: FeedbackStatus.corrected,
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackRepository.create.mockReturnValue(corrected);
    feedbackRepository.save.mockResolvedValue(corrected);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).resolves.toBe(corrected);

    expect(feedbackRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        correctedValue: 120.39,
        status: FeedbackStatus.corrected,
      }),
    );
  });

  it('blocks automatic correction when suggested entity does not exist for owner', async () => {
    const feedback = {
      id: 'feedback-invalid-entity',
      owner,
      originalText: 'compra qualquer',
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: { category: 1 },
      reasons: [],
      suggestedCorrections: { category: 'Categoria Fantasma' },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).rejects.toThrow('Correcao sugerida falhou na revalidacao semantica.');

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: false,
        reasons: expect.arrayContaining([
          expect.objectContaining({
            code: AutoReviewReasonCode.semanticRevalidationFailed,
          }),
        ]),
      }),
    );
  });

  it('does not reapply an automatic correction already marked as applied', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      status: FeedbackStatus.pending,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: {},
      reasons: [],
      suggestedCorrections: {
        category: 'Mercado',
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue({
      id: 'history-id',
      applied: true,
    });

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).resolves.toBe(feedback);

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).not.toHaveBeenCalled();
  });

  it('blocks automatic correction over feedback with human correction', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      status: FeedbackStatus.pending,
      correctedCategory: 'Mercado',
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: {},
      reasons: [],
      suggestedCorrections: {
        category: 'Variado',
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };
    const history = { id: 'history-id', applied: false };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).rejects.toThrow(
      'Feedback com correcao humana nao pode ser autocorrigido.',
    );

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: false,
        appliedAt: null,
        reasons: expect.arrayContaining([
          expect.objectContaining({
            code: AutoReviewReasonCode.humanCorrectionPresent,
          }),
        ]),
      }),
    );
  });

  it('does not apply automatic correction when feedback is already corrected', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      status: FeedbackStatus.corrected,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: {},
      reasons: [],
      suggestedCorrections: {
        category: 'Mercado',
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).resolves.toBe(feedback);

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).not.toHaveBeenCalled();
  });

  it('blocks automatic correction over manually corrected account', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      status: FeedbackStatus.pending,
      correctedAccount: 'santander',
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: {},
      reasons: [],
      suggestedCorrections: {
        account: 'nubank digo',
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).rejects.toThrow(
      'Feedback com correcao humana nao pode ser autocorrigido.',
    );

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: false,
        reasons: expect.arrayContaining([
          expect.objectContaining({
            code: AutoReviewReasonCode.humanCorrectionPresent,
          }),
        ]),
      }),
    );
  });

  it('blocks automatic correction over manually corrected value', async () => {
    const feedback = {
      id: 'feedback-id',
      owner,
      status: FeedbackStatus.pending,
      correctedValue: 120.39,
    } as FeedbackEntity;
    const evaluation = {
      decision: AutoReviewDecision.correct,
      mode: AutoReviewMode.automatic,
      score: 0.9,
      fieldScores: {},
      reasons: [],
      suggestedCorrections: {
        value: 99.9,
      },
      reviewVersion: 'auto-review-automatic-v1',
      evaluatedAt: '2026-06-17T10:00:00.000Z',
    };

    feedbackAutoReviewRepository.findOne.mockResolvedValue(null);
    feedbackAutoReviewRepository.create.mockImplementation(value => value);
    feedbackAutoReviewRepository.save.mockImplementation(async value => value);

    await expect(
      service.applyAutoReviewCorrection(feedback, evaluation),
    ).rejects.toThrow(
      'Feedback com correcao humana nao pode ser autocorrigido.',
    );

    expect(feedbackRepository.save).not.toHaveBeenCalled();
    expect(feedbackAutoReviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: false,
        reasons: expect.arrayContaining([
          expect.objectContaining({
            code: AutoReviewReasonCode.humanCorrectionPresent,
          }),
        ]),
      }),
    );
  });
});
