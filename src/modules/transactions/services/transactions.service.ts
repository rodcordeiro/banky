import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { BaseService } from '@/common/services/base.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { CategoriesService } from '@/modules/categories/services/categories.service';

import { TransactionsEntity } from '@/modules/transactions/entities/transactions.entity';
import { CreateTransactionDTO } from '@/modules/transactions/dto/create.dto';

@Injectable()
export class TransactionsService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('TRANSACTIONS_REPOSITORY')
    private _repository: Repository<TransactionsEntity>,
    private readonly _accountsService: AccountsService,
    private readonly _categoriesService: CategoriesService,
  ) {
    super();
  }

  async store(data: CreateTransactionDTO & { owner: string }) {
    try {
      const details = this._repository.create(data);
      const transaction = await this._repository.save(details);
      const account = await this._accountsService.findOneBy({
        id: data.account,
      });
      const category = await this._categoriesService.findOneBy({
        id: data.category,
      });
      this.accountsService.update(account.id, {
        ammount: account.ammount + data.value * (category.positive ? 1 : -1),
      });
      return transaction;
    } catch {
      throw new NotImplementedException();
    }
  }
}
