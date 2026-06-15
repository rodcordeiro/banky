import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrainFeedbackDto {
  @ApiPropertyOptional({ type: 'boolean' })
  fullTraining?: boolean;
}
