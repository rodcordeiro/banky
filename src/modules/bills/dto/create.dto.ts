import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsCurrency,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { BillsTypes } from '../types/bills.types';

export class CreateBillDTO {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: true, enum: BillsTypes.BillFrequency })
  @IsNotEmpty()
  @IsString()
  @IsEnum(BillsTypes.BillFrequency)
  frequency: BillsTypes.BillFrequency;

  @ApiProperty({ required: true, type: 'number' })
  @IsNotEmpty()
  @IsCurrency(
    {
      allow_decimal: true,
      decimal_separator: '.',
    },
    { message: 'Invalid currency value' },
  )
  value: number;

  owner: string;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  account: string;
}
