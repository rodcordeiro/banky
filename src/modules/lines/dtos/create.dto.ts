import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateLineSchema = z.object({
  nome: z.string(),
  categoria: z.number(),
  canal_youtube: z.string().url().optional(),
});

export class CreateLineDTO extends createZodDto(CreateLineSchema) {
  /**
   * Name of the category.
   * @example Logun Edé
   */
  @ApiProperty()
  nome: string;
  /**
   * Category of the line
   * @Example 1
   */
  @ApiProperty()
  categoria: number;

  /**
   * Youtube channel url.
   * @example https://www.youtube.com/playlist?list=PLGVpem6YJ3vZ8IrGdHMgTgHE7xw81nmHt
   */
  @ApiProperty()
  canal_youtube?: string;
}
