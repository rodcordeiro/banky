import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewLearningReassessmentDto {
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  from?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  to?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  baselineFrom?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  baselineTo?: string;

  @ApiPropertyOptional({ type: 'number' })
  maxExamples?: number;
}
