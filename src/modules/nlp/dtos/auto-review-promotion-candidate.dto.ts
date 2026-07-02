import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutoReviewPromotionStatus } from '../interfaces';

export class AutoReviewPromotionCandidateQueryDto {
  @ApiPropertyOptional({ enum: AutoReviewPromotionStatus })
  status?: AutoReviewPromotionStatus;
}

export class AutoReviewPromotionCandidateActionDto {
  @ApiPropertyOptional({ type: 'string' })
  notes?: string;
}

export class AutoReviewPromotionCandidateRollbackDto extends AutoReviewPromotionCandidateActionDto {
  @ApiProperty({ type: 'string' })
  reason: string;
}
