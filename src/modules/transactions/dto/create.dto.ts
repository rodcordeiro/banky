import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateTransactionSchema = z.object({
  description: z.string(),
  account: z.string(),
  category: z.string(),
  value: z.number(),
});

export class CreateTransactionDTO extends createZodDto(
  CreateTransactionSchema,
) {
  /** Transaction description */
  @ApiProperty()
  description: string;

  /** Transaction description */
  @ApiProperty()
  account: string;

  /** Transaction description */
  @ApiProperty()
  category: string;

  /** Transaction description */
  @ApiProperty()
  value: number;
}
