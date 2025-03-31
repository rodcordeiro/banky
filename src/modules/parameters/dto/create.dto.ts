import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateParameterSchema = z.object({
  name: z.string(),
  key: z.string(),
});

export class CreateParameterDTO extends createZodDto(CreateParameterSchema) {
  /** Parameter name */
  @ApiProperty()
  name: string;

  /** Parameter identification key */
  @ApiProperty()
  key: string;
}
