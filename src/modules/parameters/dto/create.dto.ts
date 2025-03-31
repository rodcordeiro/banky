import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateParameterSchema = z.object({
  name: z.string(),
  key: z.string(),
});

const CreateParameterValueSchema = z.object({
  parameter: z.string(),
  value: z.string(),
});

export class CreateParameterDTO extends createZodDto(CreateParameterSchema) {
  /** Parameter name */
  @ApiProperty()
  name: string;

  /** Parameter identification key */
  @ApiProperty()
  key: string;
}

export class CreateParameterValueDTO extends createZodDto(
  CreateParameterValueSchema,
) {
  /** Parameter which this value is related to */
  @ApiProperty()
  parameter: string;

  /** Parameter value */
  @ApiProperty()
  value: string;
}
