import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CreateCategorySchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  positive: z.boolean(),
  internal: z.boolean().optional(),
});

export class CreateCategoryDTO extends createZodDto(CreateCategorySchema) {
  /** Category name */
  @ApiProperty()
  name: string;

  /** Category group */
  @ApiPropertyOptional()
  category?: string;

  /** Category is credit or debit */
  @ApiProperty()
  positive: boolean;

  /** Category is internal and must be ignored in transactions reports. */
  @ApiPropertyOptional()
  internal?: boolean;
}
