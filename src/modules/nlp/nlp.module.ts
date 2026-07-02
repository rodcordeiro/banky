import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NlpController } from './controllers/nlp.controller';
import { FeedbackAutoReviewShadowService } from './services/feedback-auto-review-shadow.service';
import { NlpProviders } from './providers/nlp.provider';
import { FeedbackAutoReviewLearningService } from './services/feedback-auto-review-learning.service';
import { FeedbackAutoReviewPromotionService } from './services/feedback-auto-review-promotion.service';
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
    FeedbackAutoReviewPromotionService,
  ],
  exports: [NlpService, FeedbackAutoReviewService],
})
export class NlpModule {}
