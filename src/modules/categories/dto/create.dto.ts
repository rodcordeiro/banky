import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { ApiProperty } from '@nestjs/swagger';

const CreateCategorySchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  positive: z.boolean(),
});

export class CreateCategoryDTO extends createZodDto(CreateCategorySchema) {
  /** Category name */
  @ApiProperty()
  name: string;

  /** Category group */
  @ApiProperty({ required: false })
  category?: string;

  /** Category is credit or debit */
  @ApiProperty()
  positive: boolean;
}
