import { IsOptional, IsString, IsEnum } from 'class-validator';

import { AccountType } from '../types/accounts.types';

export class UpdateAccountDTO {
  @IsOptional()
  name: string;

  @IsOptional()
  @IsString()
  @IsEnum(AccountType)
  type: AccountType;
}
