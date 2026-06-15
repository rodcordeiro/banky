import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NlpController } from './controllers/nlp.controller';
import { NlpProviders } from './providers/nlp.provider';
import { NlpService } from './services/nlp.service';

@Module({
  imports: [PaginationModule, ParametersModule, TransactionsModule],
  controllers: [NlpController],
  providers: [...NlpProviders, NlpService],
  exports: [NlpService],
})
export class NlpModule {}
