import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const UpdateRythmSchema = z.object({
  nome: z.string(),
});

export class UpdateRythmDTO extends createZodDto(UpdateRythmSchema) {
  /**
   * Name of the category.
   * @example Logun Edé
   */
  @ApiProperty()
  nome: string;
}
