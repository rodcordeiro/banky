import { BadRequestException } from '@nestjs/common';
import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  Repository,
} from 'typeorm';

import { PaginationService } from '@/core/paginate/paginate.service';

export abstract class BaseService<
  Entity extends ObjectLiteral = ObjectLiteral,
> {
  protected repository: Repository<Entity>;

  constructor(protected readonly paginateService: PaginationService) {}

  async findAll(
    options: IPaginationOptions = { page: 1, limit: 10 },
    searchOptions?: FindManyOptions<Entity>,
  ): Promise<Pagination<Entity>> {
    return this.paginateService.paginate(
      this.repository,
      options,
      searchOptions,
    );
  }

  async findBy(options: FindManyOptions<Entity>) {
    return await this.repository.find({
      ...options,
    });
  }

  async findOneBy(options: FindOneOptions<Entity>['where']) {
    try {
      const data = await this.repository.findOneOrFail({
        where: {
          ...options,
        },
      });
      return data;
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Entity not found');
    }
  }

  async store(data: DeepPartial<Entity>) {
    const details = this.repository.create(data);
    return await this.repository.save(details);
  }
  async update(id: string, data: DeepPartial<Entity>) {
    const details = await this.findOneBy({ id } as never);
    this.repository.merge(details, data);
    return await this.repository.save(details);
  }
  async destroy(id: string) {
    await this.findBy({ id } as never);
    await this.repository.delete({ id } as never);
  }
}
