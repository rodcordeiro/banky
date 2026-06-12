import { DataSource } from 'typeorm';
import { FeedbackEntity } from '../entities/feedback.entity';

export const NlpProviders = [
  {
    provide: 'FEEDBACK_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(FeedbackEntity),
    inject: ['DATA_SOURCE'],
  },
];
