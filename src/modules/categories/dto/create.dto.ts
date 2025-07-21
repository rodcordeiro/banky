import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryClassification } from '../entities/categories.entity';

const CreateCategorySchema = z.object({
  name: z.string(),
  positive: z.boolean(),
  classification: z.nativeEnum(CategoryClassification).optional().nullable(),
  category: z.string().optional(),
  internal: z.boolean().optional(),
});

export class CreateCategoryDTO extends createZodDto(CreateCategorySchema) {
  /** Category name */
  @ApiProperty()
  name: string;

  /** Category is credit or debit */
  @ApiProperty()
  positive: boolean;

  /** Category classification between essential, important or optional */
  @ApiPropertyOptional()
  classification?: CategoryClassification;

  /** Category group */
  @ApiPropertyOptional()
  category?: string;

  /** Category is internal and must be ignored in transactions reports. */
  @ApiPropertyOptional()
  internal?: boolean;
}
