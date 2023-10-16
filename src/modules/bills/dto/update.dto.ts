import { IsEnum, IsString, IsUUID, IsCurrency } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { BillsTypes } from '../types/bills.types';

export class UpdateBillDTO {
  @ApiProperty({ required: false })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsEnum(BillsTypes.BillFrequency)
  frequency: BillsTypes.BillFrequency;

  @ApiProperty({ required: false })
  @IsCurrency(
    {
      allow_decimal: true,
      decimal_separator: '.',
    },
    { message: 'Invalid currency value' },
  )
  value: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsUUID()
  account: string;
}
