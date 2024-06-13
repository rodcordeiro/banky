import { DataSource } from 'typeorm';
import { LineEntity } from '../entities/lines.entity';

export const linesProviders = [
  {
    provide: 'LINE_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(LineEntity),
    inject: ['DATA_SOURCE'],
  },
];
