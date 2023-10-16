import { Module } from '@nestjs/common';

import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';
import { BillsModule } from '@/modules/bills/bills.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    AccountsModule,
    BillsModule,
    ExpensesModule,
  ],
  controllers: [],
  providers: [],
})
export class SharedModule {}
