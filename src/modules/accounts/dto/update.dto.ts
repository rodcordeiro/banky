import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { AccountType } from '../types/accounts.types';

export class UpdateAccountDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsEnum(AccountType)
  type: AccountType;
}
