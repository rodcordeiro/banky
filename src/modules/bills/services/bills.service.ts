import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';

import { UsersService } from '@/modules/users/services/users.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';

import { BillsEntity } from 'src/modules/bills/entities/bills.entity';

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
}
