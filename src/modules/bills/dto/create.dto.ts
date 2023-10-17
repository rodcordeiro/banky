import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
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

  owner: string;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  account: string;
}
