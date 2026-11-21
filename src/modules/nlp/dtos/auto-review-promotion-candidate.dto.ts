import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutoReviewPromotionStatus } from '../interfaces';

export class AutoReviewPromotionCandidateQueryDto {
  @ApiPropertyOptional({ enum: AutoReviewPromotionStatus })
  status?: AutoReviewPromotionStatus;
}

export class AutoReviewPromotionHistoryQueryDto {
  @ApiPropertyOptional({ type: 'string' })
  candidateVersion?: string;
}

export class AutoReviewPromotionCandidateActionDto {
  @ApiPropertyOptional({ type: 'string' })
  notes?: string;

  @ApiPropertyOptional({ type: 'string' })
  reasonCode?: string;

  @ApiPropertyOptional({ enum: ['agree', 'override'] })
  decisionVsRecommendation?: 'agree' | 'override';

  @ApiPropertyOptional({ type: 'string' })
  exceptionalReason?: string;
}

export class AutoReviewPromotionCandidateRollbackDto extends AutoReviewPromotionCandidateActionDto {
  @ApiProperty({ type: 'string' })
  reason: string;

  @ApiPropertyOptional({ enum: ['immediate', 'pause', 'expire'] })
  kind?: 'immediate' | 'pause' | 'expire';
}
