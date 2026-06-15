import { BaseClassifier } from '@/common/classifiers/base.classifier';
import { IntentClassifier, Intents } from './intent.classifier';

type IntentCase = {
  sentence: string;
  model: Intents;
  expected: Intents;
};

const intentCases: IntentCase[] = [
  {
    sentence: 'Santander para nubank digo, 03/03, 643',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Santander para nubank digo, 11/01/26, 70',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Santander para nubank digo, 10/01/26, 200.00',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 4877',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 818.16',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Santander para nubank digo, 19/12/25, 3700',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Transferi 50 do santander pro mercado pago',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta Nubank Digo, dia 15/11, transferi 606.64 para o Mercado Pago',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Na conta santander, dia 13/10, transferi 30 para o nubank yah',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta Mercado Pago, dia 12/11, transferi 18 para o Nubank Digo',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta Nubank nick, dia 12/11, transferi 47 para o Nubank Digo',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta Mercado Pago, dia 09/11, transferi 60 para o Nubank Digo',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta santander, dia 14/11, transferi 2900 para o Nubank Digo',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Na conta santander, dia 08/11, transferi 212.8 para o mercado',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta Nubank yah, dia 08/11, transferi 180 para o nubank digo',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Transferi 100 do nubank digo para o nubank nick para presente dia 20/10',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence:
      'Na conta santander, dia 17/10, transferi 53.9 para o mercado pago',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'fiz pix para o mercado pago de 150',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'mandei 80 para o nubank yah',
    model: Intents.CREATE,
    expected: Intents.TRANSFER,
  },
  {
    sentence: 'Paguei 1251 de aluguel no santander',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Caiu o pagamento de 3500 hoje no nubank digo',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: '43.40 do booster de Magic na Nubank yah credito dia 09/10',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Recebi 4470 de salario liquido no dia 01/10/25 no santander',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta Mercado Pago, dia 29/11, 53.9 do yt premium',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta Mercado Pago, dia 17/11, 552.74 do emprestimo',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta nubank digo, dia 15/11, 180 da parcela 2/10 do pc',
    model: Intents.CREATE,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta Mercado Pago, dia 03/11, 8 na Martins Fontes',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta Mercado Pago, dia 31/10, 30 com carona para o raizes',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta Mercado Pago, dia 09/11, 186.8 com lanches',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta santander, dia 14/11, 120.39 de Mercado',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta santander, dia 14/11, 3697 de Salario',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta santander, dia 14/11, 14.99 de Farmacia',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta santander, dia 10/11, 30 de recarga bilhete unico',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta santander, dia 07/11, 40 de tarifa do banco',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 263.68 de Luz',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 140.84 de agua',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: '13.69 de lanche no Smartbreak no Nubank digo 4/11',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: '17.88 de cafe no Smartbreak no Nubank digo 4/11',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
  {
    sentence: '4.95 de uber no Nubank digo 26/10',
    model: Intents.TRANSFER,
    expected: Intents.CREATE,
  },
];

describe('IntentClassifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(intentCases)(
    'classifies intent for corrected feedback phrase: $sentence',
    async ({ sentence, model, expected }) => {
      jest.spyOn(BaseClassifier.prototype, 'classify').mockResolvedValue(model);
      const classifier = new IntentClassifier();

      await expect(classifier.classify(sentence)).resolves.toBe(expected);
    },
  );
});
