import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';
import { PaymentsEntity } from '@/modules/payments/entities/payments.entity';

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
  })
  threshold: number;

  /** Joins */
  @ManyToOne(() => PaymentsEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'paymentType',
    referencedColumnName: 'id',
  })
  paymentType: string;

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
