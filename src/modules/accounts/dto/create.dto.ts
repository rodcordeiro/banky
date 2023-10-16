import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

import { AccountType } from '../types/accounts.types';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDTO {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  owner?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEnum(AccountType)
  type: AccountType;
}
