import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewComparativeReplayDto {
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  from?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  to?: string;

  @ApiPropertyOptional({
    type: 'number',
    description: 'Janela recente em dias para split temporal (default 30).',
  })
  recentDays?: number;

  @ApiPropertyOptional({ type: 'number' })
  valueApprovalLimit?: number;
}
