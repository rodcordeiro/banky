import { Module } from '@nestjs/common';

import { PaginationModule } from '@/core/paginate/paginate.module';
import { AccountsController } from '@/modules/accounts/controllers/accounts.controller';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { accountsProviders } from './providers/accounts.provider';

@Module({
  imports: [PaginationModule],
  controllers: [AccountsController],
  providers: [...accountsProviders, AccountsService],
  exports: [AccountsService, ...accountsProviders],
})
export class AccountsModule {}
