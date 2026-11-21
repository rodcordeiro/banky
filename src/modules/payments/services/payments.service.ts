import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';
import { PaginationService } from '@/core/paginate/paginate.service';

import { PaymentsEntity } from '@/modules/payments/entities/payments.entity';

@Injectable()
export class PaymentsService extends BaseService<PaymentsEntity> {
  override repository = this._repository;
  constructor(
    @Inject('PAYMENTS_REPOSITORY')
    private readonly _repository: Repository<PaymentsEntity>,
    paginateService: PaginationService,
  ) {
    super(paginateService);
  }
}
