type LoadCallback = (
  error: Error | null,
  classifier?: MockBayesClassifier,
) => void;

export class MockBayesClassifier {
  private readonly labels = new Map<string, string>();

  static load(_modelPath: string, _stemmer: unknown, callback: LoadCallback) {
    callback(null, new MockBayesClassifier());
  }

  addDocument(text: string, label: string) {
    this.labels.set(text, label);
  }

  train() {
    return undefined;
  }

  classify(text: string) {
    return this.labels.get(text) ?? null;
  }

  save(_modelPath: string, callback: (error?: Error | null) => void) {
    callback(null);
  }
}

export const BayesClassifier = MockBayesClassifier;
export const PorterStemmerPt = {};
