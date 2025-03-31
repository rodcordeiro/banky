import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DeepPartial, FindOneOptions, Repository } from 'typeorm';

import {
  ParameterEntity,
  ParameterValueEntity,
} from '@/modules/parameters/entities/parameters.entity';

@Injectable()
export class ParametersService {
  constructor(
    @Inject('PARAMETERS_REPOSITORY')
    private _repository: Repository<ParameterEntity>,
  ) {}

  async findAllParams() {
    return await this._repository.find();
  }
  async findAll() {
    return await this._repository.find();
  }
  async findBy(options: FindOneOptions<ParameterEntity>['where']) {
    return await this._repository.findBy(options);
  }
  async findOneBy(options: FindOneOptions<ParameterEntity>['where']) {
    try {
      const data = await this._repository.findOneOrFail({
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
  async store(data: Partial<ParameterEntity>) {
    const details = this._repository.create(data);
    return await this._repository.save(details);
  }
  async update(id: string, data: DeepPartial<ParameterEntity>) {
    const details = await this.findOneBy({ id } as any);
    this._repository.merge(details, data);
    return await this._repository.save(details);
  }
  async destroy(id: string) {
    await this.findBy({ id } as any);
    await this._repository.delete({ id } as any);
  }
}

@Injectable()
export class ParameterValuesService {
  constructor(
    @Inject('PARAMETERS_REPOSITORY')
    private _repository: Repository<ParameterEntity>,
    @Inject('PARAMETER_VALUES_REPOSITORY')
    private _paramValuesRepository: Repository<ParameterEntity>,
  ) {}

  async findAllParams() {
    return await this._repository.find();
  }
  async findAll() {
    return await this._repository.find();
  }
  async findBy(options: FindOneOptions<ParameterValueEntity>['where']) {
    return await this._paramValuesRepository.findBy(options);
  }
  async findOneBy(options: FindOneOptions<ParameterEntity>['where']) {
    try {
      const data = await this._repository.findOneOrFail({
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
  async store(data: ParameterEntity) {
    const details = this._repository.create(data);
    return await this._repository.save(details);
  }
  async update(id: string, data: DeepPartial<ParameterEntity>) {
    const details = await this.findOneBy({ id } as any);
    this._repository.merge(details, data);
    return await this._repository.save(details);
  }
  async destroy(id: string) {
    await this.findBy({ id } as any);
    await this._repository.delete({ id } as any);
  }
}
