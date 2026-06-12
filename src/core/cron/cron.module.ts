import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { RabbitModule } from '../rabbitmq/rabbitmq.module';
import { TransactionsModule } from '@/modules/transactions/transactions.module';

import { UncategorizedService } from './services/uncategorized.services';
import { NlpModule } from '@/modules/nlp/nlp.module';
import { TrainingService } from './services/training.services';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RabbitModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    NlpModule,
  ],
  providers: [UncategorizedService, TrainingService],
})
export class CronModule {}
