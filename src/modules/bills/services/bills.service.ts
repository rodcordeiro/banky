import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';

import { UsersService } from '@/modules/users/services/users.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';

import { BillsEntity } from '@/modules/bills/entities/bills.entity';
import { CreateBillDTO } from '@/modules/bills/dto/create.dto';

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(BillsEntity)
    private readonly billsRepository: Repository<BillsEntity>,
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
  ) {}

  async list(owner: string) {
    return this.billsRepository.find({
      where: {
        owner: { id: owner },
      },
    });
  }
  async findOneBy(options: FindOneOptions<BillsEntity>['where']) {
    return this.billsRepository
      .findOneByOrFail(options)
      .then(value => value)
      .catch(() => {
        throw new NotFoundException('Bill not found');
      });
  }
  async store(data: CreateBillDTO) {
    const owner = await this.usersService.findBy({
      id: data.owner,
    });
    const account = await this.accountsService.findOneBy({
      id: data.account,
    });
    const bill = this.billsRepository.create({ ...data, owner, account });
    return await this.billsRepository.save(bill);
  }
}
