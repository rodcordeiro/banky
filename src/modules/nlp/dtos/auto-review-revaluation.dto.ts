import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewRevaluationDto {
  @ApiPropertyOptional({ type: 'string' })
  reviewVersion?: string;

  @ApiPropertyOptional({ type: 'number' })
  batchSize?: number;
}
