import { Module } from '@nestjs/common';

import { PaginationModule } from '@/core/paginate/paginate.module';
import { PaymentsController } from '@/modules/payments/controllers/payments.controller';
import { PaymentsService } from '@/modules/payments/services/payments.service';
import { paymentsProviders } from './providers/payments.provider';

@Module({
  imports: [PaginationModule],
  controllers: [PaymentsController],
  providers: [...paymentsProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
