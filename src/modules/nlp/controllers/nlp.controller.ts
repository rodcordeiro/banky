import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessingDto } from '../dtos/processing.dto';
import { NlpService } from '../services/nlp.service';

import { Auth } from '@/common/decorators/auth.decorator';
import { SearchFeedbackDto } from '../dtos/search.dto';
import { ApproveFeedbackDto } from '../dtos/Approve.dto';
import { FeedbackEntity } from '../entities/feedback.entity';

@Auth()
@ApiBearerAuth()
@ApiTags('Nlp')
@Controller({
  version: '1',
  path: '/nlp',
})
export class NlpController {
  constructor(private readonly _service: NlpService) {}

  @Post()
  async process(
    @Req() req: AuthenticatedRequest,
    @Body() payload: ProcessingDto,
  ) {
    return this._service.parse(payload.text, req.user.id);
  }

  @Get()
  async index(
    @Req() req: AuthenticatedRequest,
    @Query() queries: SearchFeedbackDto,
  ) {
    return await this._service.findAll(req.user.id, queries);
  }
  @Post(':id')
  async aprove(
    @Req() req: AuthenticatedRequest,
    @Body() payload: ApproveFeedbackDto,
    @Param('id') id: string,
  ) {
    return await this._service.Review({
      ...payload,
      id,
      owner: req.user.id,
    } as unknown as Partial<FeedbackEntity>);
  }
}
