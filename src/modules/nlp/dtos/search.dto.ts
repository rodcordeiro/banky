import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackEntity } from '../entities/feedback.entity';
import { PaginateDto } from '@/core/paginate/dto/paginate.dto';

export class SearchFeedbackDto extends PaginateDto {
  @ApiPropertyOptional({
    type: 'string',
  })
  status?: FeedbackEntity['status'];

  @ApiPropertyOptional({
    type: 'boolean',
  })
  usedForTraining?: boolean;

  @ApiPropertyOptional({
    type: 'string',
  })
  id?: string;

  @ApiPropertyOptional({
    type: 'string,',
  })
  lastUpdated?: Date;
}
