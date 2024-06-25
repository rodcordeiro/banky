import { z } from 'nestjs-zod/z';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { paginationParamsSchema } from '@/common/schemas/shared.schemas';

const QueryTransactionsSchema = z.object({
  category: z.string().trim().optional(),
  ...paginationParamsSchema,
});

export class QueryTransactionsDTO extends createZodDto(
  QueryTransactionsSchema,
) {
  /** Transactions category */
  @ApiPropertyOptional()
  category?: string;
  /**
   *Limite data of the paginate transactions.
   *@example 100
   */
  @ApiPropertyOptional()
  limit?: number;
  /**
   *Current page of the paginate transactions.
   *@example 1
   */
  @ApiPropertyOptional()
  page?: number;
}
