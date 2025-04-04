import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateTransferTransactionSchema = z.object({
  description: z.string(),
  origin: z.string(),
  destiny: z.string(),
  date: z.string().optional(),
  value: z.number(),
});

export class CreateTransferTransactionDTO extends createZodDto(
  CreateTransferTransactionSchema,
) {
  /** Transaction description */
  @ApiProperty()
  description: string;

  /** Transaction origin */
  @ApiProperty()
  origin: string;
  /** Transaction origin */
  @ApiProperty()
  destiny: string;

  /** Transaction date */
  @ApiProperty()
  date: string;

  /** Transaction description */
  @ApiProperty()
  category: string;

  /** Transaction description */
  @ApiProperty()
  value: number;
}
