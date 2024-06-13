import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const GetPointsSchema = z.object({
  linha: z.string().optional(),
});

export class GetPointsDTO extends createZodDto(GetPointsSchema) {
  /** linha */
  @ApiProperty({ required: false })
  linha?: string;
}
