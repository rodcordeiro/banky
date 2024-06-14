import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';
import { PaymentsEntity } from '@/modules/payments/entities/payments.entity';
import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

@Entity('bk_tb_transactions')
export class TransactionsEntity extends BaseEntity {
  /** Columns */

  @Column()
  description: string;

  @Column({
    type: 'double',
  })
  value: number;

  /** Joins */
  @ManyToOne(() => UsersEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'owner',
    referencedColumnName: 'id',
  })
  owner: string;
  
  @ManyToOne(() => PaymentsEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'paymentType',
    referencedColumnName: 'id',
  })
  paymentType: string;
  
  @ManyToOne(() => CategoriesEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'category',
    referencedColumnName: 'id',
  })
  category: string;
  
  @ManyToOne(() => AccountsEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'account',
    referencedColumnName: 'id',
  })
  account: string;

  /** Methods */
}
