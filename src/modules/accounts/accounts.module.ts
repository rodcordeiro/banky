import { Module } from '@nestjs/common';

import { AccountsController } from '@/modules/accounts/controllers/accounts.controller';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { accountsProviders } from './providers/accounts.provider';

@Module({
  imports: [],
  controllers: [AccountsController],
  providers: [...accountsProviders, AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
