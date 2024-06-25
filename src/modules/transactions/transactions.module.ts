import { Module } from '@nestjs/common';

import { PaginationModule } from '@/core/paginate/paginate.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';
import { CategoriesModule } from '@/modules/categories/categories.module';

import { TransactionsController } from './controllers/transactions.controller';
import { TransactionsService } from './services/transactions.service';
import { transactionsProviders } from './providers/transactions.provider';

@Module({
  imports: [PaginationModule, AccountsModule, CategoriesModule],
  controllers: [TransactionsController],
  providers: [...transactionsProviders, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
