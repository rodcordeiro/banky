import {
    Inject,
    Injectable,
  } from '@nestjs/common';
  import {  Repository } from 'typeorm';
  import { BaseService } from '@/common/services/base.service';
  
  import { TransactionsEntity } from '@/modules/transactions/entities/transactions.entity';
  
  
  @Injectable()
  export class TransactionsService extends BaseService {
    override repository = this._repository;
    constructor(
      @Inject('TRANSACTIONS_REPOSITORY')
      private _repository: Repository<TransactionsEntity>,
    ) {
      super();
    }
  
  }
  