import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';

import { AccountsController } from '@/modules/accounts/controllers/accounts.controller';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { AccountsService } from '@/modules/accounts/services/accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsEntity]), UsersModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';

import { AccountsController } from '@/modules/accounts/controllers/accounts.controller';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { AccountsService } from '@/modules/accounts/services/accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsEntity]), UsersModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

export class AccountsModule {}
