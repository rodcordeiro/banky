import { DataSource } from 'typeorm';
import { RythmEntity } from '../entities/rythtms.entity';

export const rythmsProviders = [
  {
    provide: 'RYTHM_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(RythmEntity),
    inject: ['DATA_SOURCE'],
  },
];
