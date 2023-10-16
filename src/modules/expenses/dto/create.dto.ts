import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from '../types/expenses.types';
import {
  IsCurrency,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDTO {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: true, enum: PaymentType })
  @IsNotEmpty()
  @IsString()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  bill?: string;
}
