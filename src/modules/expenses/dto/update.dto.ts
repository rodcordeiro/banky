import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from '../types/expenses.types';
import {
  IsCurrency,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateExpenseDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ required: false, enum: PaymentType })
  @IsOptional()
  @IsString()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({ required: false, type: 'number' })
  @IsOptional()
  @IsCurrency(
    {
      allow_decimal: true,
      decimal_separator: '.',
      digits_after_decimal: [1, 2],
    },
    { message: 'Invalid currency value' },
  )
  value: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  account: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  bill?: string;
}
