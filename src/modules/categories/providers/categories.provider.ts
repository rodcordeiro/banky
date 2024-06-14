import { DataSource } from 'typeorm';
import { CategoriesEntity } from '../entities/categories.entity';

export const categoriesProviders = [
  {
    provide: 'CATEGORIES_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(CategoriesEntity),
    inject: ['DATA_SOURCE'],
  },
];
