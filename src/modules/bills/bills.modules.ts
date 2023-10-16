import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';

import { BillsEntity } from '@/modules/bills/entities/bills.entity';
import { BillsService } from 'src/modules/bills/services/bills.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillsEntity]), UsersModule],
  controllers: [],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
