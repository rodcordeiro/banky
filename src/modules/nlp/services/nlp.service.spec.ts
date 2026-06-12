import { IntentClassifier, Intents } from '../classifiers/intent.classifier';
import { AccountsClassifier } from '../classifiers/account.classifier';
import { CategoryClassifier } from '../classifiers/category.classifier';
import { ValueClassifier } from '../classifiers/value.classifier';
import { NlpService } from './nlp.service';

const owner = '1c48d2bf-2d52-4764-98df-d81be158b01b';

const accounts = [
  { name: 'nubank digo' },
  { name: 'Nubank yah' },
  { name: 'Crédito yah' },
  { name: 'Crédito digo' },
  { name: 'santander' },
  { name: 'mercado pago' },
  { name: 'nubank nick' },
  { name: 'c6' },
];

const categories = [
  { name: 'Magic' },
  { name: 'Mercado' },
  { name: 'Serviços de streaming' },
  { name: 'Serviço de Internet' },
  { name: 'Farmácia' },
  { name: 'Bilhete único' },
  { name: 'Taxa de serviço' },
  { name: 'Aluguel' },
  { name: 'Água e esgoto' },
  { name: 'Luz' },
  { name: 'Almoço' },
  { name: 'Smartbreak' },
  { name: 'Parcela de Empréstimo' },
  { name: 'Variado' },
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
  const paginateService = {
    paginate: jest.fn(),
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
      paginateService as never,
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
});
