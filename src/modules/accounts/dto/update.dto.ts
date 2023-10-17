import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { AccountType } from '../types/accounts.types';
export class UpdateAccountDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @MaxLength(50)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsEnum(AccountType)
  type: AccountType;
}
