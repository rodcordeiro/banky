import { ValueClassifier } from './value.classifier';

type ValueCase = {
  sentence: string;
  expected: number;
};

const valueCases: ValueCase[] = [
  { sentence: 'Santander para nubank digo, 03/03, 643', expected: 643 },
  {
    sentence: 'Santander, 14/01/26, 50 emprestado para o bizzi',
    expected: 50,
  },
  {
    sentence: 'Santander, 11/01/26, 62.68 no mercadinho',
    expected: 62.68,
  },
  {
    sentence: 'Santander, 11/01/26, 299.38 de ifood',
    expected: 299.38,
  },
  { sentence: 'Santander para nubank digo, 11/01/26, 70', expected: 70 },
  { sentence: 'Santander, 11/01/26, 170.00 a identificar', expected: 170 },
  { sentence: 'Santander, 10/01/26, 100 a identificar', expected: 100 },
  {
    sentence: 'Santander para nubank digo, 10/01/26, 200.00',
    expected: 200,
  },
  { sentence: 'Santander, 09/01/26, 151.79 de ifood', expected: 151.79 },
  { sentence: 'Santander, 08/01/26, 40 taxa bancaria', expected: 40 },
  { sentence: 'Santander, 08/01/26, 1280.00 de aluguel', expected: 1280 },
  { sentence: 'Santander, 02/01/26, 3896 de salario', expected: 3896 },
  { sentence: 'Santander para nubank digo, 29/12/25, 4877', expected: 4877 },
  {
    sentence: 'Santander para nubank digo, 29/12/25, 818.16',
    expected: 818.16,
  },
  {
    sentence: 'Santander, 19/12/25, 5687 de outras receitas',
    expected: 5687,
  },
  {
    sentence: 'Santander, 23/12/25, 354.62 de parcela emprestimo',
    expected: 354.62,
  },
  { sentence: 'Santander para nubank digo, 19/12/25, 3700', expected: 3700 },
  { sentence: 'Santander, 19/12/25, 3708.17 de salario', expected: 3708.17 },
  {
    sentence: '11.49 no smartbreak com mercado pago dia 04/03',
    expected: 11.49,
  },
  {
    sentence:
      'Paguei 262.83 para recarregar o bu da nick com santander, 04/03/26',
    expected: 262.83,
  },
  {
    sentence: 'Paguei 57 com lanche dia 26/02 pelo mercado pago',
    expected: 57,
  },
  {
    sentence: 'Paguei 139.90 de gas de cozinha com mercado pago 26/02',
    expected: 139.9,
  },
  {
    sentence: 'Paguei 25.11 no mercado com mercado pago dia 25',
    expected: 25.11,
  },
  {
    sentence: 'Paguei 57.76 no mercado com mercado pago dia 25',
    expected: 57.76,
  },
  { sentence: 'Smartbreak, 25/02, mercado pago, 5.99', expected: 5.99 },
  {
    sentence: '14 reais de caldo de cana pago com mercado pago dia 24/02',
    expected: 14,
  },
  { sentence: '0.12 de rendimento no mercado pago dia 24/02', expected: 0.12 },
  { sentence: '13.19 de smartbreak, 23/02, mercado pago', expected: 13.19 },
  { sentence: '8.86 no mercadinho dia 23/02 com mercado pago', expected: 8.86 },
  {
    sentence: 'Santander, 21/02, paguei 30 reais pro jeff de carona pro raizes',
    expected: 30,
  },
  { sentence: '51.11 do mercado pago no mercadinho', expected: 51.11 },
  {
    sentence: 'Na conta santander, dia 14/11, 120.39 de Mercado',
    expected: 120.39,
  },
  {
    sentence: 'Na conta santander, dia 14/11, 3697 de Salario',
    expected: 3697,
  },
  {
    sentence: 'Na conta santander, dia 14/11, 14.99 de Farmacia',
    expected: 14.99,
  },
  {
    sentence: 'Na conta santander, dia 11/11, transferi 70 para o Nubank nick',
    expected: 70,
  },
  {
    sentence: 'Na conta santander, dia 10/11, 30 de recarga bilhete unico',
    expected: 30,
  },
  {
    sentence: 'Na conta santander, dia 08/11, transferi 212.8 para o mercado',
    expected: 212.8,
  },
  {
    sentence: 'Na conta santander, dia 07/11, 40 de tarifa do banco',
    expected: 40,
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 263.68 de Luz',
    expected: 263.68,
  },
  {
    sentence: 'Na conta nubank yah, dia 06/11, 140.84 de agua',
    expected: 140.84,
  },
];

describe('ValueClassifier', () => {
  const classifier = new ValueClassifier();

  it.each(valueCases)(
    'extracts value from corrected feedback phrase: $sentence',
    ({ sentence, expected }) => {
      expect(classifier.extract(sentence)).toBe(expected);
    },
  );
});
