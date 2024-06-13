import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';

import { UsersEntity } from '@/modules/users/entities/users.entity';
import { UpdateUserDTO } from '@/modules/users/dto/update.dto';
import { CreateUserDTO } from '../dto/create.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_REPOSITORY')
    private _usersRepository: Repository<UsersEntity>,
  ) {}
  async findAll() {
    return await this._usersRepository.find();
  }

  async findBy(options: FindOneOptions<UsersEntity>['where']) {
    try {
      const user = await this._usersRepository.findOneOrFail({
        where: {
          ...options,
        },
      });
      return user;
    } catch (err) {
      console.error(err);
      throw new NotFoundException('User not found');
    }
  }

  async validate(options: FindOneOptions<UsersEntity>['where']) {
    try {
      return await this._usersRepository.findOneOrFail({
        select: ['password', 'username', 'id'],
        where: options,
      });
    } catch (err) {
      throw new NotFoundException('User not found');
    }
  }

  async store(data: CreateUserDTO) {
    const alreadyRegistered = await this._usersRepository.findOneBy({
      username: data.username,
    });
    if (alreadyRegistered)
      throw new BadRequestException(`Username ${data.username} already in use`);
    const user = this._usersRepository.create(data);
    return await this._usersRepository.save(user);
  }

  async update(id: number, data: UpdateUserDTO) {
    const user = await this._usersRepository.findOneOrFail({ where: { id } });
    this._usersRepository.merge(user, data);
    return await this._usersRepository.save(user);
  }

  async destroy(id: number) {
    await this._usersRepository.findOneOrFail({ where: { id } });
    await this._usersRepository.delete({ id });
  }

  async updateToken(id: number, refreshToken: string) {
    const user = await this._usersRepository.findOneOrFail({ where: { id } });
    this._usersRepository.merge(user, { refreshToken });
    await this._usersRepository.save(user);
  }
}
