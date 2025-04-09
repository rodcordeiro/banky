import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { BaseService } from '@/common/services/base.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { CategoriesService } from '@/modules/categories/services/categories.service';
import { ParameterValuesService } from '@/modules/parameters/services/parameters.service';
import { PaginationService } from '@/core/paginate/paginate.service';

import { TransactionsEntity } from '@/modules/transactions/entities/transactions.entity';
import { CreateTransactionDTO } from '@/modules/transactions/dto/create.dto';
import { QueryTransactionsDTO } from '../dto/query.dto';
import { CreateTransferTransactionDTO } from '../dto/transfer.dto';

@Injectable()
export class TransactionsService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('TRANSACTIONS_REPOSITORY')
    private readonly _repository: Repository<TransactionsEntity>,
    private readonly _accountsService: AccountsService,
    private readonly _categoriesService: CategoriesService,
    private readonly _paginateService: PaginationService,
    private readonly _parametersService: ParameterValuesService,
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
    const uncategorizedPositiveParams =
      await this._parametersService.findOneByQueryBuilder(async qb => {
        qb.innerJoin('bk_tb_parameters', 'b', 'a.parameter = b.id');
        qb.where('b.key in :key', {
          key: 'unknown_positive_category',
        });
        return await qb.getOneOrFail();
      });
    const uncategorizedNegativeParams =
      await this._parametersService.findOneByQueryBuilder(async qb => {
        qb.innerJoin('bk_tb_parameters', 'b', 'a.parameter = b.id');
        qb.where('b.key in :key', {
          key: 'unknown_negative_category',
        });
        return await qb.getOneOrFail();
      });
    return this._repository
      .createQueryBuilder('a')
      .where({
        category: {
          id: [
            uncategorizedPositiveParams.value,
            uncategorizedNegativeParams.value,
          ],
        },
      })
      .getMany();
  }
  async createTransfer(data: CreateTransferTransactionDTO & { owner: string }) {
    const originAccount = await this._accountsService.findOneBy({
      id: data.origin,
    });
    const destinyAccount = await this._accountsService.findOneBy({
      id: data.destiny,
    });

    const originCategoryParam =
      await this._parametersService.findOneByQueryBuilder(async qb => {
        qb.innerJoin('bk_tb_parameters', 'b', 'a.parameter = b.id');
        qb.where('b.key = :key', { key: 'transference_origin_category' });
        return await qb.getOneOrFail();
      });

    const destinyCategoryParam =
      await this._parametersService.findOneByQueryBuilder(async qb => {
        qb.innerJoin('bk_tb_parameters', 'b', 'a.parameter = b.id');
        qb.where('b.key = :key', { key: 'transference_destiny_category' });
        return await qb.getOneOrFail();
      });

    const originCategory = await this._categoriesService.findOneBy({
      id: originCategoryParam.value,
    });
    const destinyCategory = await this._categoriesService.findOneBy({
      id: destinyCategoryParam.value,
    });

    const batchId = randomUUID();

    const originTransaction = this._repository.create({
      description: data.description,
      value: data.value,
      batchId,
      owner: data.owner,
      category: originCategory.id,
      account: originAccount.id,
      date: data.date || new Date().toISOString(),
    });
    const destinyTransaction = this._repository.create({
      description: data.description,
      value: data.value,
      batchId,
      owner: data.owner,
      category: destinyCategory.id,
      account: destinyAccount.id,
      date: data.date || new Date().toISOString(),
    });

    await this._repository.save([originTransaction, destinyTransaction]);
    await this._accountsService.update(originAccount.id, {
      ammount: originAccount.ammount - data.value,
    });
    await this._accountsService.update(destinyAccount.id, {
      ammount: destinyAccount.ammount + data.value,
    });
  }
}
