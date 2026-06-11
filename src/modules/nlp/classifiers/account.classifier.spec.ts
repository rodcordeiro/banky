import { AccountsClassifier } from './account.classifier';

type AccountCase = {
  sentence: string;
  expected: string;
};

const accountCases: AccountCase[] = [
  {
    sentence: 'Santander para nubank digo, 03/03, 643',
    expected: 'nubank digo',
  },
  {
    sentence: 'Santander, 14/01/26, 50 emprestado para o bizzi',
    expected: 'santander',
  },
  {
    sentence: 'Santander, 11/01/26, 62.68 no mercadinho',
    expected: 'santander',
  },
  { sentence: 'Santander, 11/01/26, 299.38 de ifood', expected: 'santander' },
  {
    sentence: 'Santander para nubank digo, 11/01/26, 70',
    expected: 'nubank digo',
  },
  {
    sentence: 'Santander, 11/01/26, 170.00 a identificar',
    expected: 'santander',
  },
  { sentence: 'Santander, 10/01/26, 100 a identificar', expected: 'santander' },
  {
    sentence: 'Santander para nubank digo, 10/01/26, 200.00',
    expected: 'nubank digo',
  },
  { sentence: 'Santander, 09/01/26, 151.79 de ifood', expected: 'santander' },
  { sentence: 'Santander, 08/01/26, 40 taxa bancaria', expected: 'santander' },
  {
    sentence: 'Santander, 08/01/26, 1280.00 de aluguel',
    expected: 'santander',
  },
  { sentence: 'Santander, 02/01/26, 3896 de salario', expected: 'santander' },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 4877',
    expected: 'nubank digo',
  },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 818.16',
    expected: 'nubank digo',
  },
  {
    sentence: 'Santander, 19/12/25, 5687 de outras receitas',
    expected: 'santander',
  },
  {
    sentence: 'Santander, 23/12/25, 354.62 de parcela emprestimo',
    expected: 'santander',
  },
  {
    sentence: 'Santander para nubank digo, 19/12/25, 3700',
    expected: 'nubank digo',
  },
  {
    sentence: 'Santander, 19/12/25, 3708.17 de salario',
    expected: 'santander',
  },
  {
    sentence: '11.49 no smartbreak com mercado pago dia 04/03',
    expected: 'mercado pago',
  },
  {
    sentence:
      'Paguei 262.83 para recarregar o bu da nick com santander, 04/03/26',
    expected: 'santander',
  },
  {
    sentence: 'Paguei 57 com lanche dia 26/02 pelo mercado pago',
    expected: 'mercado pago',
  },
  {
    sentence: 'Paguei 139.90 de gas de cozinha com mercado pago 26/02',
    expected: 'mercado pago',
  },
  {
    sentence: 'Paguei 25.11 no mercado com mercado pago dia 25',
    expected: 'mercado pago',
  },
  {
    sentence: 'Paguei 57.76 no mercado com mercado pago dia 25',
    expected: 'mercado pago',
  },
  {
    sentence: 'Smartbreak, 25/02, mercado pago, 5.99',
    expected: 'mercado pago',
  },
  {
    sentence: '14 reais de caldo de cana pago com mercado pago dia 24/02',
    expected: 'mercado pago',
  },
  {
    sentence: '0.12 de rendimento no mercado pago dia 24/02',
    expected: 'mercado pago',
  },
  {
    sentence: '13.19 de smartbreak, 23/02, mercado pago',
    expected: 'mercado pago',
  },
  {
    sentence: '8.86 no mercadinho dia 23/02 com mercado pago',
    expected: 'mercado pago',
  },
  {
    sentence: 'Santander, 21/02, paguei 30 reais pro jeff de carona pro raizes',
    expected: 'santander',
  },
  { sentence: '51.11 do mercado pago no mercadinho', expected: 'mercado pago' },
  {
    sentence: 'Na conta santander, dia 14/11, 120.39 de Mercado',
    expected: 'santander',
  },
  {
    sentence: 'Na conta santander, dia 14/11, 3697 de Salario',
    expected: 'santander',
  },
  {
    sentence: 'Na conta santander, dia 14/11, 14.99 de Farmacia',
    expected: 'santander',
  },
  {
    sentence: 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
    expected: 'nubank nick',
  },
  {
    sentence: 'Na conta santander, dia 10/11, 30 de recarga bilhete unico',
    expected: 'santander',
  },
  {
    sentence: 'Na conta santander, dia 08/11, transferi 212.8 para o mercado',
    expected: 'mercado pago',
  },
  {
    sentence: 'Na conta santander, dia 07/11, 40 de tarifa do banco',
    expected: 'santander',
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 263.68 de Luz',
    expected: 'nubank yah',
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 140.84 de agua',
    expected: 'nubank yah',
  },
];

describe('AccountsClassifier', () => {
  it.each(accountCases)(
    'keeps account prediction for corrected feedback phrase: $sentence',
    async ({ sentence, expected }) => {
      const classifier = new AccountsClassifier();
      const classifyMock = jest.fn().mockReturnValue(expected);
      (
        classifier as unknown as {
          classifier: { classify: typeof classifyMock };
        }
      ).classifier = { classify: classifyMock };

      const result = await classifier.classify(sentence);

      expect(result).toBe(expected);
      expect(classifyMock).toHaveBeenCalledWith(
        classifier.preprocess(sentence),
      );
    },
  );
});
