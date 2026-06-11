import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrainFeedbackDto {
  @ApiPropertyOptional({ type: 'string' })
  owner?: string;

  @ApiPropertyOptional({ type: 'boolean' })
  fullTraining?: boolean;
}
