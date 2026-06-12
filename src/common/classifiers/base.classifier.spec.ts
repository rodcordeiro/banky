import { BaseClassifier } from './base.classifier';

describe('BaseClassifier preprocess', () => {
  const classifier = new BaseClassifier('test.model');

  it('normalizes accents and lexical variants', () => {
    const processed = classifier.preprocess(
      'Mercadinnho, taxa bancária, smart break, pra pagar o BU',
    );

    expect(processed).toBe(
      'mercadinho taxa de servico smartbreak para pagar o bilhete unico',
    );
  });
});
