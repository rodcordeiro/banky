import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';

import { UsersService } from '@/modules/users/services/users.service';
import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { BillsService } from '@/modules/bills/services/bills.service';

import { ExpensesEntity } from '../entities/expenses.entity';
import { CreateExpenseDTO } from '../dto/create.dto';
import { UpdateExpenseDTO } from '../dto/update.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpensesEntity)
    private readonly expensesRepository: Repository<ExpensesEntity>,
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly billsService: BillsService,
  ) {}

  async list(owner: string) {
    return this.expensesRepository.find({
      where: {
        owner: { id: owner },
      },
    });
  }

  async findOneBy(options: FindOneOptions<ExpensesEntity>['where']) {
    return this.expensesRepository
      .findOneByOrFail(options)
      .then(value => value)
      .catch(() => {
        throw new NotFoundException('Expense not found');
      });
  }

  async store(data: CreateExpenseDTO) {
    const owner = await this.usersService.findBy({
      id: data.owner,
    });
    const account = await this.accountsService.findOneBy({
      id: data.account,
    });
    const bill = data.bill
      ? await this.billsService.findOneBy({
          id: data.bill,
        })
      : undefined;
    const expense = this.expensesRepository.create({
      ...data,
      owner,
      account,
      bill,
    });
    return await this.expensesRepository.save(expense);
  }

  async update(id: string, data: UpdateExpenseDTO) {
    const expense = await this.findOneBy({ id });
    const account = data.account
      ? await this.accountsService.findOneBy({
          id: data.account,
        })
      : expense.account;
    const bill = data.bill
      ? await this.billsService.findOneBy({
          id: data.bill,
        })
      : expense.bill;
    this.expensesRepository.merge(expense, { ...data, account, bill });
    return await this.expensesRepository.save(expense);
  }

  async delete(id: string) {
    await this.findOneBy({ id });
    await this.expensesRepository.delete({ id });
  }
}
