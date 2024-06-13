import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const UpdatePointSchema = z.object({
  letra: z.string().optional(),
  linha: z.number().optional(),
  ritmo: z.number().optional(),
  audio_url: z.string().url().optional(),
});

export class UpdatePointDTO extends createZodDto(UpdatePointSchema) {
  /**
   * lirycs of the music.
   * @example Logun Edé
   */
  @ApiProperty()
  letra?: string;
  /** linha */
  @ApiProperty()
  linha?: number;
  /** rythm */
  @ApiProperty()
  ritmo?: number;
  /** link do audio */
  @ApiProperty()
  audio_url?: string;
}
