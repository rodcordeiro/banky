import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';

import { BaseService } from '@/common/services/base.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { CategoriesService } from '@/modules/categories/services/categories.service';

import { TransactionsEntity } from '@/modules/transactions/entities/transactions.entity';
import { CreateTransactionDTO } from '@/modules/transactions/dto/create.dto';
import { PaginationService } from '@/core/paginate/paginate.service';
import { QueryTransactionsDTO } from '../dto/query.dto';

@Injectable()
export class TransactionsService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('TRANSACTIONS_REPOSITORY')
    private _repository: Repository<TransactionsEntity>,
    private readonly _accountsService: AccountsService,
    private readonly _categoriesService: CategoriesService,
    private readonly _paginateService: PaginationService,
  ) {
    super();
  }
  async listAll(query: QueryTransactionsDTO & { owner: string }) {
    console.log(query);
    return this._paginateService.paginate(
      this._repository,
      {
        limit: query.limit,
        page: query.page,
      },
      {
        select: [
          'id',
          'date',
          'account',
          'category',
          'createdAt',
          'updatedAt',
          'description',
          'value',
        ],
        relations: {
          account: true,
          category: true,
        },
        order: {
          date: 'desc',
        },
        where: {
          owner: { id: query.owner },
          category: query.category ? { id: query.category } : undefined,
        },
      } as unknown as FindManyOptions<TransactionsEntity>,
    );
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
      this._accountsService.update(account.id, {
        ammount: account.ammount + data.value * (category.positive ? 1 : -1),
      });
      return transaction;
    } catch {
      throw new NotImplementedException();
    }
  }

  async uncategorized() {
    return this._repository
      .createQueryBuilder('a')
      .where({ category: { id: 'b5c6184e-7e7a-44bf-a60d-919fb1be1ed0' } })
      .orWhere({ category: { id: 'da842e12-9627-4636-85e9-b833bb9adf93' } })
      .getMany();
  }
}
