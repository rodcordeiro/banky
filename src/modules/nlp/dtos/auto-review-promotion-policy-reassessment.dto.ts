import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewPromotionPolicyReassessmentDto {
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  from?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  to?: string;

  @ApiPropertyOptional({ type: 'number' })
  valueApprovalLimit?: number;
}
