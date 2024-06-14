import { DataSource } from 'typeorm';
import { PaymentsEntity } from '../entities/payments.entity';

export const paymentsProviders = [
  {
    provide: 'PAYMENTS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(PaymentsEntity),
    inject: ['DATA_SOURCE'],
  },
];
