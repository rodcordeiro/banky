import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { NlpController } from './controllers/Nlp.controller';
import { NlpProviders } from './providers/nlp.provider';
import { NlpService } from './services/nlp.service';

@Module({
  imports: [PaginationModule, ParametersModule],
  controllers: [NlpController],
  providers: [...NlpProviders, NlpService],
  exports: [NlpService],
})
export class NlpModule {}
