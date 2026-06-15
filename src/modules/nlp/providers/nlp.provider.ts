import { DataSource } from 'typeorm';
import { AccountsEntity } from '../../accounts/entities/accounts.entity';
import { CategoriesEntity } from '../../categories/entities/categories.entity';
import { FeedbackAutoReviewEntity } from '../entities/feedback-auto-review.entity';
import { FeedbackEntity } from '../entities/feedback.entity';

export const NlpProviders = [
  {
    provide: 'FEEDBACK_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(FeedbackEntity),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'ACCOUNTS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(AccountsEntity),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'CATEGORIES_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(CategoriesEntity),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'FEEDBACK_AUTO_REVIEW_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(FeedbackAutoReviewEntity),
    inject: ['DATA_SOURCE'],
  },
];
