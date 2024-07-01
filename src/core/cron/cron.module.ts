import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { RabbitModule } from '../rabbitmq/rabbitmq.module';
import { TransactionsModule } from '@/modules/transactions/transactions.module';

import { UncategorizedService } from './services/uncategorized.services';

@Module({
  imports: [ScheduleModule.forRoot(), RabbitModule, TransactionsModule],
  providers: [UncategorizedService],
})
export class CronModule {}
