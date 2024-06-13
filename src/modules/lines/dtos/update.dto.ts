import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const UpdateLineSchema = z.object({
  nome: z.string().optional(),
  categoria: z.number().optional(),
  canal_youtube: z.string().url().optional(),
});

export class UpdateLineDTO extends createZodDto(UpdateLineSchema) {
  /**
   * Name of the category.
   * @example Logun Edé
   */
  @ApiProperty()
  nome?: string;
  /**
   * Category of the line
   * @Example 1
   */
  @ApiProperty()
  categoria?: number;

  /**
   * Youtube channel url.
   * @example https://www.youtube.com/playlist?list=PLGVpem6YJ3vZ8IrGdHMgTgHE7xw81nmHt
   */
  @ApiProperty()
  canal_youtube?: string;
}
