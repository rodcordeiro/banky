import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { UncategorizedService } from './services/uncategorized.services';
import { TransactionsModule } from '@/modules/transactions/transactions.module';

@Module({
  imports: [ScheduleModule.forRoot(),TransactionsModule],
  providers: [UncategorizedService],
})
export class CronModule {}
