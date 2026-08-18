import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';
import { PaginationService } from '@/core/paginate/paginate.service';

import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

@Injectable()
export class AccountsService extends BaseService<AccountsEntity> {
  override repository = this._repository;
  constructor(
    @Inject('ACCOUNTS_REPOSITORY')
    private readonly _repository: Repository<AccountsEntity>,
    paginateService: PaginationService,
  ) {
    super(paginateService);
  }
}
