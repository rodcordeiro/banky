import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewLearningLoopDto {
  @ApiPropertyOptional({ type: 'number' })
  maxExamples?: number;
}
