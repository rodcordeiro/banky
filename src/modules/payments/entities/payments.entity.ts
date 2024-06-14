import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

@Entity('bk_tb_payments')
export class PaymentsEntity extends BaseEntity {
  /** Columns */

  @Column()
  name: string;

  /** Joins */

  /** Methods */
}
