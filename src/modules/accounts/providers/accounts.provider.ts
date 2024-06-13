import { DataSource } from 'typeorm';
import { AccountsEntity } from '../entities/accounts.entity';

export const accountsProviders = [
  {
    provide: 'ACCOUNTS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(AccountsEntity),
    inject: ['DATA_SOURCE'],
  },
];
