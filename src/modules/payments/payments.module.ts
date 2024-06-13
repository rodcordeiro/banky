import { Module } from '@nestjs/common';

import { PaymentsController } from '@/modules/payments/controllers/payments.controller';
import { PaymentsService } from '@/modules/payments/services/payments.service';
import { paymentsProviders } from './providers/payments.provider';

@Module({
  imports: [],
  controllers: [PaymentsController],
  providers: [...paymentsProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
