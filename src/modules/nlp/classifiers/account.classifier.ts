import { BaseClassifier } from '@/common/classifiers/base.classifier';

export class AccountsClassifier extends BaseClassifier {
  constructor() {
    super('account.model');
  }
}
