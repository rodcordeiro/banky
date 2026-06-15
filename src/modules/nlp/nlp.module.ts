import { PaginationModule } from '@/core/paginate/paginate.module';
import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NlpController } from './controllers/nlp.controller';
import { FeedbackAutoReviewShadowService } from './services/feedback-auto-review-shadow.service';
import { NlpProviders } from './providers/nlp.provider';
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
  ],
  exports: [NlpService, FeedbackAutoReviewService],
})
export class NlpModule {}
