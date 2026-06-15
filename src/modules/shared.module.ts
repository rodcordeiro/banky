import { Module } from '@nestjs/common';

import { HealthModule } from '@/modules/health/health.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ParametersModule } from './parameters/parameters.module';
import { NlpModule } from './nlp/nlp.module';
@Module({
  imports: [
    HealthModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
    ParametersModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    NlpModule,
  ],
  controllers: [],
  providers: [],
})
export class SharedModule {}
