import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutoReviewAliasSuggestionQueryDto {
  @ApiPropertyOptional({ type: 'number' })
  minVolume?: number;
}

export class AutoReviewAliasSuggestionPromoteDto {
  @ApiProperty({ enum: ['account', 'category'] })
  field: 'account' | 'category';

  @ApiProperty({ type: 'string' })
  pattern: string;

  @ApiProperty({ type: 'string' })
  predicted: string;

  @ApiProperty({ type: 'string' })
  corrected: string;

  @ApiPropertyOptional({ type: 'number' })
  minVolume?: number;
}
