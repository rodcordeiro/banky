import { Module } from '@nestjs/common';

import { TransactionsController } from '@/modules/transactions/controllers/transactions.controller';
import { TransactionsService } from '@/modules/transactions/services/transactions.service';
import { transactionsProviders } from './providers/transactions.provider';

@Module({
  imports: [],
  controllers: [TransactionsController],
  providers: [...transactionsProviders, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
