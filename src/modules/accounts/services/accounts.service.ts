import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';

import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

@Injectable()
export class AccountsService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('ACCOUNTS_REPOSITORY')
    private _repository: Repository<AccountsEntity>,
  ) {
    super();
  }
}
