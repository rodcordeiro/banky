import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';
import { CategoriesEntity } from '@/modules/categories/entities/categories.entity';
import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

@Entity('bk_tb_transactions')
export class TransactionsEntity extends BaseEntity {
  /** Columns */

  @Column()
  description: string;

  @Column()
  date: string;

  @Column({
    type: 'double',
  })
  value: number;

  /** Joins */
  @ManyToOne(() => UsersEntity, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({
    name: 'owner',
    referencedColumnName: 'id',
  })
  owner: string;

  @ManyToOne(() => CategoriesEntity, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({
    name: 'category',
    referencedColumnName: 'id',
  })
  category: string;

  @ManyToOne(() => AccountsEntity, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({
    name: 'account',
    referencedColumnName: 'id',
  })
  account: string;

  /** Methods */
}
