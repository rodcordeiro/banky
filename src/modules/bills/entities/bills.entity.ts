import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

import { UsersEntity } from '@/modules/users/entities/users.entity';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

import { BillsTypes } from '@/modules/bills/types/bills.types';
import { ExpensesEntity } from '@/modules/expenses/entities/expenses.entity';

@Entity({ name: 'banky_tb_bills' })
export class BillsEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: BillsTypes.BillFrequency,
    default: BillsTypes.BillFrequency.MONTHLY,
  })
  frequency: BillsTypes.BillFrequency;

  /** Joins */
  @ManyToOne(() => UsersEntity, user => user.accounts)
  @JoinColumn()
  owner: UsersEntity;

  @ManyToOne(() => AccountsEntity, account => account.bills)
  @JoinColumn()
  account: AccountsEntity;

  @OneToMany(() => ExpensesEntity, expense => expense.bill)
  @JoinColumn()
  expenses: ExpensesEntity[];
}
