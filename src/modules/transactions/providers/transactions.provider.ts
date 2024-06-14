import { DataSource } from 'typeorm';
import { TransactionsEntity } from '../entities/transactions.entity';

export const transactionsProviders = [
  {
    provide: 'TRANSACTIONS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionsEntity),
    inject: ['DATA_SOURCE'],
  },
];
