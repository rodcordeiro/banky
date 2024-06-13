import { DataSource } from 'typeorm';
import { PointsEntity } from '../entities/points.entity';

export const pointsProviders = [
  {
    provide: 'POINTS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(PointsEntity),
    inject: ['DATA_SOURCE'],
  },
];
