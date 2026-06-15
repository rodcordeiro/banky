import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessingDto } from '../dtos/processing.dto';
import { NlpService } from '../services/nlp.service';
import { FeedbackAutoReviewShadowService } from '../services/feedback-auto-review-shadow.service';

import { Auth } from '@/common/decorators/auth.decorator';
import { SearchFeedbackDto } from '../dtos/search.dto';
import { ApproveFeedbackDto } from '../dtos/Approve.dto';
import { FeedbackEntity } from '../entities/feedback.entity';
import { TrainFeedbackDto } from '../dtos/training.dto';
import { AutoReviewReportDto } from '../dtos/auto-review-report.dto';

@Auth()
@ApiBearerAuth()
@ApiTags('Nlp')
@Controller({
  version: '1',
  path: '/nlp',
})
export class NlpController {
  constructor(
    private readonly _service: NlpService,
    private readonly _shadowService: FeedbackAutoReviewShadowService,
  ) {}

  @Post()
  async process(
    @Req() req: AuthenticatedRequest,
    @Body() payload: ProcessingDto,
  ) {
    return this._service.parse(payload.text, req.user.id);
  }

  @Get('/models')
  async models() {
    return await this._service.getClassifierModels();
  }

  @Get()
  async index(
    @Req() req: AuthenticatedRequest,
    @Query() queries: SearchFeedbackDto,
  ) {
    return await this._service.findAll(req.user.id, queries);
  }

  @Post(':id/review')
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

  @Post('/training')
  async train(
    @Req() req: AuthenticatedRequest,
    @Query() query: TrainFeedbackDto,
  ) {
    return await this._service.trainClassifiers(
      query.fullTraining,
      req.user.id,
    );
  }

  @Post('/:id/transaction')
  async createTransactionFromFeedback(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return await this._service.createTransactionFromFeedback(id, req.user.id);
  }

  @Get('/auto-review/report')
  async autoReviewReport(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewReportDto,
  ) {
    return await this._shadowService.buildOperationalReport(
      req.user.id,
      queries,
    );
  }
}
