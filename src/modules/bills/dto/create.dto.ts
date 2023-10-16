import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsCurrency,
} from 'class-validator';
import { BillsTypes } from '../types/bills.types';

export class CreateBillDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(BillsTypes.BillFrequency)
  frequency: BillsTypes.BillFrequency;

  @IsNotEmpty()
  @IsCurrency(
    {
      allow_decimal: true,
      decimal_separator: '.',
    },
    { message: 'Invalid currency value' },
  )
  value: number;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  owner: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  account: string;
}
