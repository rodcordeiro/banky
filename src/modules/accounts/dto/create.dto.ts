import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

const CreateAccountSchema = z.object({
  name: z.string(),
  ammount: z.number(),
  paymentType: z.string(),
  threshold: z.number(),
});

export class CreateAccountDTO extends createZodDto(CreateAccountSchema) {
  /** Account name */
  @ApiProperty()
  name: string;

  /** Account ammount */
  @ApiProperty()
  ammount: number;

  /** Account payment type */
  @ApiProperty()
  paymentType: string;

  /** Account limit threshold */
  @ApiProperty()
  threshold: number;
}
