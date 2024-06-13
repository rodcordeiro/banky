import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const UpdateGiraSchema = z.object({
  gira: z.string().date().optional(),
  fechada: z.boolean().optional(),
});

export class UpdateGiraDTO extends createZodDto(UpdateGiraSchema) {
  /**
   * Data da gira
   * @example 2024/05/04
   */
  @ApiProperty()
  date?: string;
  /**
   * Se a gira foi fechada ou não
   * @example 2024/05/04
   */
  @ApiProperty()
  fechada?: boolean;
}
