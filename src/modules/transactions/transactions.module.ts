import { Module } from '@nestjs/common';

import { AccountsModule } from '@/modules/accounts/accounts.module';

import { TransactionsController } from '@/modules/transactions/controllers/transactions.controller';
import { TransactionsService } from '@/modules/transactions/services/transactions.service';
import { transactionsProviders } from './providers/transactions.provider';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [AccountsModule, CategoriesModule],
  controllers: [TransactionsController],
  providers: [...transactionsProviders, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
