import { Module } from '@nestjs/common';

import { ParametersController } from '@/modules/parameters/controllers/parameters.controller';
import {
  ParametersService,
  ParameterValuesService,
} from '@/modules/parameters/services/parameters.service';
import {
  parametersProviders,
  parameterValuesProviders,
} from './providers/parameters.provider';

@Module({
  imports: [],
  controllers: [ParametersController],
  providers: [
    ...parametersProviders,
    ...parameterValuesProviders,
    ParametersService,
    ParameterValuesService,
  ],
  exports: [ParametersService, ParameterValuesService],
})
export class ParametersModule {}
