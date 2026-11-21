import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NlpController } from './controllers/nlp.controller';
import { FeedbackAutoReviewShadowService } from './services/feedback-auto-review-shadow.service';
import { NlpProviders } from './providers/nlp.provider';
import { FeedbackAutoReviewLearningService } from './services/feedback-auto-review-learning.service';
import { FeedbackAutoReviewLearningReassessmentService } from './services/feedback-auto-review-learning-reassessment.service';
import { FeedbackAutoReviewPromotionPolicyReassessmentService } from './services/feedback-auto-review-promotion-policy-reassessment.service';
import { FeedbackAutoReviewPromotionService } from './services/feedback-auto-review-promotion.service';
import { FeedbackAutoReviewComparativeReplayService } from './services/feedback-auto-review-comparative-replay.service';
import { FeedbackAutoReviewEffectiveAliasService } from './services/feedback-auto-review-effective-alias.service';
import { FeedbackAutoReviewQualityService } from './services/feedback-auto-review-quality.service';
import { FeedbackAutoReviewAliasSuggestionService } from './services/feedback-auto-review-alias-suggestion.service';
import { FeedbackAutoReviewService } from './services/feedback-auto-review.service';
import { NlpService } from './services/nlp.service';

@Module({
  imports: [PaginationModule, ParametersModule, TransactionsModule],
  controllers: [NlpController],
  providers: [
    ...NlpProviders,
    NlpService,
    FeedbackAutoReviewService,
    FeedbackAutoReviewShadowService,
    FeedbackAutoReviewLearningService,
    FeedbackAutoReviewLearningReassessmentService,
    FeedbackAutoReviewPromotionPolicyReassessmentService,
    FeedbackAutoReviewQualityService,
    FeedbackAutoReviewEffectiveAliasService,
    FeedbackAutoReviewPromotionService,
    FeedbackAutoReviewComparativeReplayService,
    FeedbackAutoReviewAliasSuggestionService,
  ],
  exports: [NlpService, FeedbackAutoReviewService],
})
export class NlpModule {}
