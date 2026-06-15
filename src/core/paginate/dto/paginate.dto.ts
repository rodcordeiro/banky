import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginateDto {
  /*
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
