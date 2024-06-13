import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';

import { CategoryEntity } from '../entities/categories.entity';
import { CreateCategoryDTO } from '../dtos/create.dto';

@Injectable()
export class CategoryServices {
  constructor(
    @Inject('CATEGORY_REPOSITORY')
    private _repository: Repository<CategoryEntity>,
  ) {}
  async findAll() {
    return await this._repository.find();
  }

  async findBy(options: FindOneOptions<CategoryEntity>['where']) {
    try {
      const category = await this._repository.findOneOrFail({
        where: {
          ...options,
        },
      });
      return category;
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Category not found');
    }
  }

  async store(data: CreateCategoryDTO) {
    const alreadyRegistered = await this._repository.findOneBy({
      nome: data.nome,
    });
    if (alreadyRegistered)
      throw new BadRequestException(`Categoria ${data.nome} já existe`);
    const category = this._repository.create(data);
    return await this._repository.save(category);
  }

  async update(id: number, data: CreateCategoryDTO) {
    const user = await this._repository.findOneOrFail({ where: { id } });
    this._repository.merge(user, data);
    return await this._repository.save(user);
  }

  async destroy(id: number) {
    await this._repository.findOneOrFail({ where: { id } });
    await this._repository.delete({ id });
  }
}
