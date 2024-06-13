import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';

import { LineEntity } from '../entities/lines.entity';
import { CreateLineDTO } from '../dtos/create.dto';
import { UpdateLineDTO } from '../dtos/update.dto';

@Injectable()
export class LineServices {
  constructor(
    @Inject('LINE_REPOSITORY')
    private _repository: Repository<LineEntity>,
  ) {}
  async findAll() {
    return await this._repository.find();
  }

  async findBy(options: FindOneOptions<LineEntity>['where']) {
    try {
      const category = await this._repository.findOneOrFail({
        where: {
          ...options,
        },
      });
      return category;
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Line not found');
    }
  }

  async store(data: CreateLineDTO) {
    const alreadyRegistered = await this._repository.findOneBy({
      nome: data.nome,
    });
    if (alreadyRegistered)
      throw new BadRequestException(`Line ${data.nome} already exists`);
    const category = this._repository.create(data);
    return await this._repository.save(category);
  }

  async update(id: number, data: UpdateLineDTO) {
    const user = await this._repository.findOneOrFail({ where: { id } });
    this._repository.merge(user, data);
    return await this._repository.save(user);
  }

  async destroy(id: number) {
    await this.findBy({ id });
    await this._repository.delete({ id });
  }
}
