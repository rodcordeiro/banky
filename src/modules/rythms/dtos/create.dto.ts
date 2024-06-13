import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateRythmSchema = z.object({
  nome: z.string(),
});

export class CreateRythmDTO extends createZodDto(CreateRythmSchema) {
  /**
   * Name of the category.
   * @example Logun Edé
   */
  @ApiProperty()
  nome: string;
}
