import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';
import { BillsModule } from '@/modules/bills/bills.module';

import { ExpensesEntity } from './entities/expenses.entity';
import { ExpensesController } from './controllers/expenses.controller';
import { ExpensesService } from './services/expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpensesEntity]),
    UsersModule,
    AccountsModule,
    BillsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
