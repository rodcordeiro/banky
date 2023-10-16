import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

import { UsersEntity } from '@/modules/users/entities/users.entity';
import { BillsEntity } from '@/modules/bills/entities/bills.entity';
import { ExpensesEntity } from '@/modules/expenses/entities/expenses.entity';

import { AccountType } from '../types/accounts.types';

@Entity({ name: 'banky_tb_accounts' })
export class AccountsEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.DEBIT,
  })
  type: AccountType;

  /** Joins */
  @ManyToOne(() => UsersEntity, user => user.accounts)
  @JoinColumn()
  owner: UsersEntity;

  @OneToMany(() => BillsEntity, bill => bill.account)
  @JoinColumn()
  bills: BillsEntity[];

  @OneToMany(() => ExpensesEntity, expense => expense.account)
  @JoinColumn()
  expenses: ExpensesEntity[];

  /** Methods */
}
