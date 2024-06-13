import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tb_categorias')
export class CategoryEntity extends BaseEntity {
  /** Columns */
  @Column()
  nome: string;

  /** Joins */

  /** Methods */
}
