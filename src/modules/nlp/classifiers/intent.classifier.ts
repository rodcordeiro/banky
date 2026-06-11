import { BaseClassifier } from '@/common/classifiers/base.classifier';

export enum Intents {
  // eslint-disable-next-line no-unused-vars
  TRANSFER = 'transfer',
  // eslint-disable-next-line no-unused-vars
  CREATE = 'create',
}

export class IntentClassifier extends BaseClassifier {
  constructor() {
    super('intent.model');
  }
  TRANSFER_VERBS = [
    'transferi',
    'enviei',
    'mandei',
    'passei',
    'movi',
    'movimentei',
    'pix para',
    'fiz pix',
    'fiz um pix',
    'pixei para',
  ];

  hasTransferVerb(text: string) {
    const t = text.toLowerCase();
    return this.TRANSFER_VERBS.some(v => t.includes(v));
  }

  hasAccountToAccountPattern(text: string) {
    const t = text.toLowerCase().trim();
    const accountToAccountPatterns = [
      /^(?:na conta\s+)?[a-z0-9à-ÿ][a-z0-9à-ÿ\s-]{1,50}\s+para\s+[a-z0-9à-ÿ][a-z0-9à-ÿ\s-]{1,50}(?:,|$)/i,
      /\b(?:do|de)\s+[a-z0-9à-ÿ][a-z0-9à-ÿ\s-]{1,50}\s+para\s+[a-z0-9à-ÿ][a-z0-9à-ÿ\s-]{1,50}(?:,|$)/i,
    ];
    return accountToAccountPatterns.some(pattern => pattern.test(t));
  }

  override async classify(text: string): Promise<string> {
    const classified = await super.classify(text);
    const hasTransferSignal =
      this.hasTransferVerb(text) || this.hasAccountToAccountPattern(text);

    if (hasTransferSignal) return Intents.TRANSFER;

    if (classified === Intents.TRANSFER) {
      return Intents.CREATE;
    }
    return classified as string;
  }
}
