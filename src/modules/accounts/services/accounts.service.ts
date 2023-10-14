import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';

import { UsersService } from '@/modules/users/services/users.service';

import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';
import { CreateAccountDTO } from '@/modules/accounts/dto/create.dto';
import { UpdateAccountDTO } from '@/modules/accounts/dto/update.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountsEntity)
    private readonly accountsRepository: Repository<AccountsEntity>,
    private readonly usersService: UsersService,
  ) {}

  async list(ownerId: string) {
    return this.accountsRepository.find({
      where: {
        owner: { id: ownerId },
      },
    });
  }
  async findOneBy(options: FindOneOptions<AccountsEntity>['where']) {
    return this.accountsRepository
      .findOneByOrFail(options)
      .then(value => value)
      .catch(() => {
        throw new NotFoundException('Account not found');
      });
  }

  async create(data: CreateAccountDTO) {
    const owner = await this.usersService.findBy({
      id: data.owner,
    });
    const account = this.accountsRepository.create({
      ...data,
      owner,
    });
    return await this.accountsRepository.save(account);
  }

  async update(id: string, data: UpdateAccountDTO) {
    const account = await this.findOneBy({
      id,
    });
    this.accountsRepository.merge(account, { ...data });
    return await this.accountsRepository.save(account);
  }

  async delete(id: string) {
    await this.accountsRepository.findOneOrFail({ where: { id } });
    await this.accountsRepository.delete({ id });
  }
}
