import { BaseClassifier } from '@/common/classifiers/base.classifier';

export class CategoryClassifier extends BaseClassifier {
  constructor() {
    super('category.model');
  }
}
