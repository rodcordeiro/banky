import { Module } from '@nestjs/common';

import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';

@Module({
  imports: [UsersModule, AuthModule, AccountsModule],
  controllers: [],
  providers: [],
})
export class SharedModule {}
