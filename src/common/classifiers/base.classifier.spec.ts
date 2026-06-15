import { BaseClassifier } from './base.classifier';

describe('BaseClassifier', () => {
  const classifier = new BaseClassifier('test.model');

  it('normalizes accents and lexical variants', () => {
    const processed = classifier.preprocess(
      'Mercadinnho, taxa bancária, smart break, pra pagar o BU',
    );

    expect(processed).toBe(
      'mercadinho taxa de servico smartbreak para pagar o bilhete unico',
    );
  });

  it('normalizes common typo variants used by NLP samples', () => {
    const processed = classifier.preprocess(
      'Mercadinnha, mercadinhoo e taxa bancaria pro BU',
    );

    expect(processed).toBe(
      'mercadinho mercadinho e taxa de servico para bilhete unico',
    );
  });

  it('delegates classification using preprocessed text', async () => {
    const classifyMock = jest.fn().mockReturnValue('mercado');
    classifier.classifier = {
      classify: classifyMock,
    } as unknown as typeof classifier.classifier;

    await expect(
      classifier.classify('Mercadinnho com taxa bancária'),
    ).resolves.toBe('mercado');

    expect(classifyMock).toHaveBeenCalledWith('mercadinho com taxa de servico');
  });
});
