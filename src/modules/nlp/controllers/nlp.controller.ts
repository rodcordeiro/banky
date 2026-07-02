import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessingDto } from '../dtos/processing.dto';
import { NlpService } from '../services/nlp.service';
import { FeedbackAutoReviewShadowService } from '../services/feedback-auto-review-shadow.service';
import { FeedbackAutoReviewLearningService } from '../services/feedback-auto-review-learning.service';
import { FeedbackAutoReviewPromotionService } from '../services/feedback-auto-review-promotion.service';

import { Auth } from '@/common/decorators/auth.decorator';
import { SearchFeedbackDto } from '../dtos/search.dto';
import { ApproveFeedbackDto } from '../dtos/Approve.dto';
import { FeedbackEntity } from '../entities/feedback.entity';
import { TrainFeedbackDto } from '../dtos/training.dto';
import { AutoReviewReportDto } from '../dtos/auto-review-report.dto';
import { AutoReviewLearningLoopDto } from '../dtos/auto-review-learning-loop.dto';
import {
  AutoReviewPromotionCandidateActionDto,
  AutoReviewPromotionCandidateQueryDto,
  AutoReviewPromotionCandidateRollbackDto,
} from '../dtos/auto-review-promotion-candidate.dto';

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
    private readonly _learningService: FeedbackAutoReviewLearningService,
    private readonly _promotionService: FeedbackAutoReviewPromotionService,
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

  @Get('/auto-review/learning-loop')
  async autoReviewLearningLoop(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewLearningLoopDto,
  ) {
    return await this._learningService.buildLearningLoopReport(
      req.user.id,
      queries.maxExamples,
    );
  }

  @Get('/auto-review/promotion-candidates')
  async autoReviewPromotionCandidates(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewPromotionCandidateQueryDto,
  ) {
    return await this._promotionService.listCandidates(
      req.user.id,
      queries.status,
    );
  }

  @Get('/auto-review/promotion-candidates/:candidateVersion')
  async autoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
  ) {
    return await this._promotionService.getCandidate(
      req.user.id,
      candidateVersion,
    );
  }

  @Post('/auto-review/promotion-candidates/:candidateVersion/approve')
  async approveAutoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Body() payload: AutoReviewPromotionCandidateActionDto,
  ) {
    return await this._promotionService.approveCandidate(
      req.user.id,
      candidateVersion,
      req.user.id,
      payload.notes,
    );
  }

  @Post('/auto-review/promotion-candidates/:candidateVersion/reject')
  async rejectAutoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Body() payload: AutoReviewPromotionCandidateActionDto,
  ) {
    return await this._promotionService.rejectCandidate(
      req.user.id,
      candidateVersion,
      req.user.id,
      payload.notes,
    );
  }

  @Post('/auto-review/promotion-candidates/:candidateVersion/apply')
  async applyAutoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Body() payload: AutoReviewPromotionCandidateActionDto,
  ) {
    return await this._promotionService.applyCandidate(
      req.user.id,
      candidateVersion,
      req.user.id,
      payload.notes,
    );
  }

  @Post('/auto-review/promotion-candidates/:candidateVersion/rollback')
  async rollbackAutoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Body() payload: AutoReviewPromotionCandidateRollbackDto,
  ) {
    return await this._promotionService.rollbackCandidate(
      req.user.id,
      candidateVersion,
      req.user.id,
      payload.reason,
      payload.notes,
    );
  }
}
