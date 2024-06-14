import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';

import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';

@Injectable()
export class CategoriesService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('CATEGORIES_REPOSITORY')
    private _repository: Repository<CategoriesEntity>,
  ) {
    super();
  }
}
