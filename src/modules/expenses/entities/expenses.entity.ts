import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

import { UsersEntity } from '@/modules/users/entities/users.entity';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

import { PaymentType } from '@/modules/expenses/types/expenses.types';
import { BillsEntity } from '@/modules/bills/entities/bills.entity';

@Entity({ name: 'banky_tb_expenses' })
export class ExpensesEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.DEBIT,
  })
  paymentType: PaymentType;

  @Column({
    type: 'double',
  })
  value: number;

  /** Joins */
  @ManyToOne(() => UsersEntity, user => user.accounts)
  @JoinColumn()
  owner: UsersEntity;

  @ManyToOne(() => AccountsEntity, account => account.expenses)
  @JoinColumn()
  account: AccountsEntity;

  @ManyToOne(() => BillsEntity)
  @JoinColumn()
  bill: BillsEntity;
}
