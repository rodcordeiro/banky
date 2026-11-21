import { Inject, Injectable } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';
import { PaginationService } from '@/core/paginate/paginate.service';

import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';

@Injectable()
export class CategoriesService extends BaseService<CategoriesEntity> {
  override repository = this._repository;
  constructor(
    @Inject('CATEGORIES_REPOSITORY')
    private readonly _repository: Repository<CategoriesEntity>,
    paginateService: PaginationService,
  ) {
    super(paginateService);
  }

  async listAll(
    owner: string,
    options: IPaginationOptions = { page: 1, limit: 10 },
  ) {
    return this.findAll(options, {
      where: {
        owner: { id: owner },
        category: IsNull(),
      },
      relations: {
        owner: true,
        subcategories: true,
      },
    } as never);
  }
}
