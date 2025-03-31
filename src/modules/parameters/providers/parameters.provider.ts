import { DataSource } from 'typeorm';
import {
  ParameterEntity,
  ParameterValueEntity,
} from '../entities/parameters.entity';

export const parametersProviders = [
  {
    provide: 'PARAMETERS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(ParameterEntity),
    inject: ['DATA_SOURCE'],
  },
];

export const parameterValuesProviders = [
  {
    provide: 'PARAMETER_VALUES_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(ParameterValueEntity),
    inject: ['DATA_SOURCE'],
  },
];
