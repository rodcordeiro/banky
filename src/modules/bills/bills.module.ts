import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';

import { BillsEntity } from '@/modules/bills/entities/bills.entity';
import { BillsService } from 'src/modules/bills/services/bills.service';
import { BillsController } from './controllers/bills.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillsEntity]),
    UsersModule,
    AccountsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
