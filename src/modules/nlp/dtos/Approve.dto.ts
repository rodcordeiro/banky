import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../interfaces';

export class UserCorrectedJsonDto {
  @ApiProperty() intent: string;
  @ApiProperty() account: string;
  @ApiProperty() category: string;
  @ApiProperty() value: number;
  @ApiProperty() date: string;
}

export class ApproveFeedbackDto {
  @ApiProperty({ type: 'string', enum: FeedbackStatus })
  status: FeedbackStatus;

  @ApiPropertyOptional()
  correctedIntent?: string;

  @ApiPropertyOptional()
  correctedAccount?: string;

  @ApiPropertyOptional()
  orrectedOriginAccount?: string;

  @ApiPropertyOptional()
  correctedDestinyAccount?: string;

  @ApiPropertyOptional()
  orrectedCategory?: string;

  @ApiPropertyOptional()
  correctedValue?: number;

  @ApiPropertyOptional()
  correctedDate?: string;
}
