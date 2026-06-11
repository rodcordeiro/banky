import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { ParametersModule } from '../parameters/parameters.module';
import { NlpController } from './controllers/Nlp.controller';
import { NlpProviders } from './providers/nlp.provider';
import { NlpService } from './services/nlp.service';

@Module({
  imports: [
    PaginationModule,
    CategoriesModule,
    AccountsModule,
    ParametersModule,
  ],
  controllers: [NlpController],
  providers: [...NlpProviders, NlpService],
  exports: [NlpService],
})
export class NlpModule {}
