import { CategoryClassifier } from './category.classifier';

type CategoryCase = {
  sentence: string;
  expected: string;
};

const categoryCases: CategoryCase[] = [
  {
    sentence: 'Santander para nubank digo, 03/03, 643',
    expected: 'transferencia',
  },
  {
    sentence: 'Santander, 14/01/26, 50 emprestado para o bizzi',
    expected: 'emprestimo',
  },
  {
    sentence: 'Santander, 11/01/26, 62.68 no mercadinho',
    expected: 'mercearia e acougue (dia-a-dia)',
  },
  { sentence: 'Santander, 11/01/26, 299.38 de ifood', expected: 'lanches' },
  {
    sentence: 'Santander para nubank digo, 11/01/26, 70',
    expected: 'transferencia',
  },
  {
    sentence: 'Santander, 11/01/26, 170.00 a identificar',
    expected: '_a categorizar [negative]',
  },
  {
    sentence: 'Santander, 10/01/26, 100 a identificar',
    expected: '_a categorizar [negative]',
  },
  {
    sentence: 'Santander para nubank digo, 10/01/26, 200.00',
    expected: 'transferencia',
  },
  { sentence: 'Santander, 09/01/26, 151.79 de ifood', expected: 'lanches' },
  {
    sentence: 'Santander, 08/01/26, 40 taxa bancaria',
    expected: 'taxa de servico',
  },
  { sentence: 'Santander, 08/01/26, 1280.00 de aluguel', expected: 'aluguel' },
  { sentence: 'Santander, 02/01/26, 3896 de salario', expected: 'salario' },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 4877',
    expected: 'transferencia',
  },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 818.16',
    expected: 'transferencia',
  },
  {
    sentence: 'Santander, 19/12/25, 5687 de outras receitas',
    expected: 'outras receitas',
  },
  {
    sentence: 'Santander, 23/12/25, 354.62 de parcela emprestimo',
    expected: 'parcela de emprestimo',
  },
  {
    sentence: 'Santander para nubank digo, 19/12/25, 3700',
    expected: 'transferencia',
  },
  { sentence: 'Santander, 19/12/25, 3708.17 de salario', expected: 'salario' },
  {
    sentence: '11.49 no smartbreak com mercado pago dia 04/03',
    expected: 'smartbreak',
  },
  {
    sentence:
      'Paguei 262.83 para recarregar o bu da nick com santander, 04/03/26',
    expected: 'bilhete unico',
  },
  {
    sentence: 'Paguei 57 com lanche dia 26/02 pelo mercado pago',
    expected: 'lanches',
  },
  {
    sentence: 'Paguei 139.90 de gas de cozinha com mercado pago 26/02',
    expected: 'gas',
  },
  {
    sentence: 'Paguei 25.11 no mercado com mercado pago dia 25',
    expected: 'mercado',
  },
  {
    sentence: 'Paguei 57.76 no mercado com mercado pago dia 25',
    expected: 'mercado',
  },
  { sentence: 'Smartbreak, 25/02, mercado pago, 5.99', expected: 'smartbreak' },
  {
    sentence: '14 reais de caldo de cana pago com mercado pago dia 24/02',
    expected: 'variado',
  },
  {
    sentence: '0.12 de rendimento no mercado pago dia 24/02',
    expected: 'rendimento de investimento',
  },
  {
    sentence: '13.19 de smartbreak, 23/02, mercado pago',
    expected: 'smartbreak',
  },
  {
    sentence: '8.86 no mercadinho dia 23/02 com mercado pago',
    expected: 'mercearia e acougue (dia-a-dia)',
  },
  {
    sentence: 'Santander, 21/02, paguei 30 reais pro jeff de carona pro raizes',
    expected: 'variado',
  },
  {
    sentence: '51.11 do mercado pago no mercadinho',
    expected: 'mercearia e acougue (dia-a-dia)',
  },
  {
    sentence: 'Na conta santander, dia 14/11, 120.39 de Mercado',
    expected: 'mercado',
  },
  {
    sentence: 'Na conta santander, dia 14/11, 3697 de Salario',
    expected: 'salario',
  },
  {
    sentence: 'Na conta santander, dia 14/11, 14.99 de Farmacia',
    expected: 'farmacia',
  },
  {
    sentence: 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
    expected: 'transferencia',
  },
  {
    sentence: 'Na conta santander, dia 10/11, 30 de recarga bilhete unico',
    expected: 'bilhete unico',
  },
  {
    sentence: 'Na conta santander, dia 08/11, transferi 212.8 para o mercado',
    expected: 'transferencia',
  },
  {
    sentence: 'Na conta santander, dia 07/11, 40 de tarifa do banco',
    expected: 'taxa de servico',
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 263.68 de Luz',
    expected: 'luz',
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 140.84 de agua',
    expected: 'agua e esgoto',
  },
];

describe('CategoryClassifier', () => {
  it.each(categoryCases)(
    'keeps category prediction for corrected feedback phrase: $sentence',
    async ({ sentence, expected }) => {
      const classifier = new CategoryClassifier();
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
