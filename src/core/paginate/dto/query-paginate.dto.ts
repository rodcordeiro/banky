import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { paginationParamsSchema } from '@/common/schemas/shared.schemas';

export class QueryPaginateDTO extends createZodDto(
  z.object(paginationParamsSchema),
) {
  /**
   * Items per page.
   * @example 10
   */
  @ApiPropertyOptional()
  limit?: number;
  /**
   * Current page.
   * @example 1
   */
  @ApiPropertyOptional()
  page?: number;
}
