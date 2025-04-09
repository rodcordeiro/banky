import { Inject, Injectable } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service';

import { UsersEntity } from '@/modules/users/entities/users.entity';

@Injectable()
export class UsersService extends BaseService {
  override repository = this._repository;
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly _repository: Repository<UsersEntity>,
  ) {
    super();
  }

  async validate(options: FindOneOptions<UsersEntity>['where']) {
    return await this._repository.findOneOrFail({
      select: ['password', 'username', 'id'],
      where: options,
    });
  }

  async updateToken(id: string, refreshToken: string) {
    const user = await this.findOneBy({ id });
    this._repository.merge(user, { refreshToken });
    await this._repository.save(user);
  }
}
