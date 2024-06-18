import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';

@Entity('bk_tb_accounts')
export class AccountsEntity extends BaseEntity {
  /** Columns */

  @Column()
  name: string;

  @Column({
    type: 'double',
  })
  ammount: number;

  @Column({
    type: 'double',
    default: 0,
  })
  threshold: number;

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

  /** Methods */
}
