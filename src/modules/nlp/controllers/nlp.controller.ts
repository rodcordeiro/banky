import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessingDto } from '../dtos/processing.dto';
import { NlpService } from '../services/nlp.service';
import { FeedbackAutoReviewShadowService } from '../services/feedback-auto-review-shadow.service';
import { FeedbackAutoReviewLearningService } from '../services/feedback-auto-review-learning.service';
import { FeedbackAutoReviewLearningReassessmentService } from '../services/feedback-auto-review-learning-reassessment.service';
import { FeedbackAutoReviewPromotionPolicyReassessmentService } from '../services/feedback-auto-review-promotion-policy-reassessment.service';
import { FeedbackAutoReviewPromotionService } from '../services/feedback-auto-review-promotion.service';
import { FeedbackAutoReviewComparativeReplayService } from '../services/feedback-auto-review-comparative-replay.service';
import { FeedbackAutoReviewEffectiveAliasService } from '../services/feedback-auto-review-effective-alias.service';
import { FeedbackAutoReviewQualityService } from '../services/feedback-auto-review-quality.service';
import { FeedbackAutoReviewAliasSuggestionService } from '../services/feedback-auto-review-alias-suggestion.service';

import { Auth } from '@/common/decorators/auth.decorator';
import { SearchFeedbackDto } from '../dtos/search.dto';
import { ApproveFeedbackDto } from '../dtos/Approve.dto';
import { FeedbackEntity } from '../entities/feedback.entity';
import { TrainFeedbackDto } from '../dtos/training.dto';
import { AutoReviewReportDto } from '../dtos/auto-review-report.dto';
import { AutoReviewLearningLoopDto } from '../dtos/auto-review-learning-loop.dto';
import { AutoReviewLearningReassessmentDto } from '../dtos/auto-review-learning-reassessment.dto';
import { AutoReviewPromotionPolicyReassessmentDto } from '../dtos/auto-review-promotion-policy-reassessment.dto';
import { AutoReviewQualityMetricsDto } from '../dtos/auto-review-quality-metrics.dto';
import { AutoReviewRevaluationDto } from '../dtos/auto-review-revaluation.dto';
import {
  AutoReviewAliasSuggestionPromoteDto,
  AutoReviewAliasSuggestionQueryDto,
} from '../dtos/auto-review-alias-suggestion.dto';
import {
  AutoReviewPromotionCandidateActionDto,
  AutoReviewPromotionCandidateQueryDto,
  AutoReviewPromotionCandidateRollbackDto,
  AutoReviewPromotionHistoryQueryDto,
} from '../dtos/auto-review-promotion-candidate.dto';
import { AutoReviewComparativeReplayDto } from '../dtos/auto-review-comparative-replay.dto';

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
    private readonly _learningReassessmentService: FeedbackAutoReviewLearningReassessmentService,
    private readonly _promotionPolicyReassessmentService: FeedbackAutoReviewPromotionPolicyReassessmentService,
    private readonly _qualityService: FeedbackAutoReviewQualityService,
    private readonly _promotionService: FeedbackAutoReviewPromotionService,
    private readonly _comparativeReplayService: FeedbackAutoReviewComparativeReplayService,
    private readonly _effectiveAliasService: FeedbackAutoReviewEffectiveAliasService,
    private readonly _aliasSuggestionService: FeedbackAutoReviewAliasSuggestionService,
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

  @Get('/auto-review/learning-loop/reassessment')
  async autoReviewLearningLoopReassessment(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewLearningReassessmentDto,
  ) {
    return await this._learningReassessmentService.buildReassessment(
      req.user.id,
      queries,
    );
  }

  @Get('/auto-review/learning-loop/promotion-policy-reassessment')
  async autoReviewPromotionPolicyReassessment(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewPromotionPolicyReassessmentDto,
  ) {
    return await this._promotionPolicyReassessmentService.buildReassessment(
      req.user.id,
      queries,
    );
  }

  @Get('/auto-review/quality-metrics')
  async autoReviewQualityMetrics(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewQualityMetricsDto,
  ) {
    return await this._qualityService.buildQualityMetrics(req.user.id, queries);
  }

  @Post('/auto-review/revaluate')
  async autoReviewRevaluate(
    @Req() req: AuthenticatedRequest,
    @Body() payload: AutoReviewRevaluationDto,
  ) {
    return await this._shadowService.revaluatePendingBatch({
      ...payload,
      owner: req.user.id,
    });
  }

  @Get('/auto-review/alias-suggestions')
  async autoReviewAliasSuggestions(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewAliasSuggestionQueryDto,
  ) {
    return await this._aliasSuggestionService.buildAliasSuggestions(
      req.user.id,
      queries.minVolume,
    );
  }

  @Post('/auto-review/alias-suggestions/promote')
  async autoReviewAliasSuggestionPromote(
    @Req() req: AuthenticatedRequest,
    @Body() payload: AutoReviewAliasSuggestionPromoteDto,
  ) {
    return await this._aliasSuggestionService.promoteAliasSuggestion(
      req.user.id,
      req.user.id,
      payload,
    );
  }

  @Get('/auto-review/promotion-candidates')
  async autoReviewPromotionCandidates(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewPromotionCandidateQueryDto,
  ) {
    return await this._promotionService.listCandidatesEnriched(
      req.user.id,
      queries.status,
    );
  }

  @Get('/auto-review/promotion-history')
  async autoReviewPromotionHistory(
    @Req() req: AuthenticatedRequest,
    @Query() queries: AutoReviewPromotionHistoryQueryDto,
  ) {
    return await this._promotionService.buildPromotionHistory(
      req.user.id,
      queries.candidateVersion,
    );
  }

  @Get('/auto-review/promotion-candidates/:candidateVersion')
  async autoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
  ) {
    return await this._promotionService.getCandidateEnriched(
      req.user.id,
      candidateVersion,
    );
  }

  @Get('/auto-review/promotion-candidates/:candidateVersion/comparative-replay')
  async autoReviewComparativeReplay(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Query() queries: AutoReviewComparativeReplayDto,
  ) {
    return await this._comparativeReplayService.buildComparativeReplay(
      req.user.id,
      candidateVersion,
      queries,
    );
  }

  @Get('/auto-review/effective-aliases')
  async autoReviewEffectiveAliases(@Req() req: AuthenticatedRequest) {
    return await this._effectiveAliasService.listReport(req.user.id);
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
      {
        reasonCode: payload.reasonCode,
        decisionVsRecommendation: payload.decisionVsRecommendation,
        exceptionalReason: payload.exceptionalReason,
      },
    );
  }

  @Post('/auto-review/promotion-candidates/:candidateVersion/expire')
  async expireAutoReviewPromotionCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('candidateVersion') candidateVersion: string,
    @Body() payload: AutoReviewPromotionCandidateActionDto,
  ) {
    return await this._promotionService.expireApprovedCandidate(
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
      payload.kind ?? 'immediate',
    );
  }
}
