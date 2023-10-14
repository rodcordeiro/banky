import { IsNotEmpty, Matches, IsString, IsEnum } from 'class-validator';

import { RegexHelper } from '@/common/utils/regex.util';

import { AccountType } from '../types/accounts.types';

export class CreateAccountDTO {
  @IsNotEmpty()
  name: string;

  owner?: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(AccountType)
  type: AccountType;
}
