import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';

import { PaymentsEntity } from '@/modules/payments/entities/payments.entity';

@Injectable()
export class PaymentsService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('PAYMENTS_REPOSITORY')
    private _repository: Repository<PaymentsEntity>,
  ) {
    super();
  }
}
