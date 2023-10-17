import { IsEnum, IsString, IsUUID } from 'class-validator';
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
  @IsString()
  @IsUUID()
  account: string;
}
