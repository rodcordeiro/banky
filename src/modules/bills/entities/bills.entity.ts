import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

import { UsersEntity } from '@/modules/users/entities/users.entity';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

import { BillsTypes } from '@/modules/bills/types/bills.types';

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

  @Column({
    type: 'decimal',
  })
  value: number;

  /** Joins */
  @ManyToOne(() => UsersEntity, user => user.accounts)
  @JoinColumn()
  owner: UsersEntity;

  @ManyToOne(() => AccountsEntity, account => account.bills)
  @JoinColumn()
  account: AccountsEntity;
}
