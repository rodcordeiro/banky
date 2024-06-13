import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tb_ritmos')
export class RythmEntity extends BaseEntity {
  /** Columns */
  @Column()
  nome: string;

  /** Joins */

  /** Methods */
}
