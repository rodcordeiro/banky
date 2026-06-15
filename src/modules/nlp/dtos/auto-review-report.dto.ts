import { ApiPropertyOptional } from '@nestjs/swagger';
import { AutoReviewDecision, AutoReviewMode } from '../interfaces';
import { PaginateDto } from '@/core/paginate/dto/paginate.dto';

export class AutoReviewReportDto extends PaginateDto {
  @ApiPropertyOptional({ enum: AutoReviewMode })
  mode?: AutoReviewMode;

  @ApiPropertyOptional({ enum: AutoReviewDecision })
  decision?: AutoReviewDecision;

  @ApiPropertyOptional({ type: 'number' })
  minScore?: number;

  @ApiPropertyOptional({ type: 'number' })
  maxScore?: number;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  from?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  to?: string;

  @ApiPropertyOptional({ type: 'boolean' })
  divergence?: boolean;

  @ApiPropertyOptional({
    enum: ['createdAt', 'score', 'divergence'],
  })
  sortBy?: 'createdAt' | 'score' | 'divergence';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  order?: 'ASC' | 'DESC';
}
