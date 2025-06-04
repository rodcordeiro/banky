import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

const CreditPaymentTransactionSchema = z.object({
  origin: z.string(),
  destiny: z.string(),
  date: z.string().optional(),
  value: z.number(),
});

export class CreditPaymentTransactionDTO extends createZodDto(
  CreditPaymentTransactionSchema,
) {
  /** Transaction origin */
  @ApiProperty()
  origin: string;
  /** Transaction origin */
  @ApiProperty()
  destiny: string;

  /** Transaction date */
  @ApiProperty()
  date?: string;

  /** Transaction description */
  @ApiProperty()
  value: number;
}
