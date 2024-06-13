import { DataSource } from 'typeorm';
import { GirasEntity, GirasLinhasEntity } from '../entities/giras.entity';

export const girasProviders = [
  {
    provide: 'GIRAS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(GirasEntity),
    inject: ['DATA_SOURCE'],
  },
];
export const girasLinhasProviders = [
  {
    provide: 'GIRAS_LINHA_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(GirasLinhasEntity),
    inject: ['DATA_SOURCE'],
  },
];
