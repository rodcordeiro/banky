import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { CategoryEntity } from '@/modules/categories/entities/categories.entity';

@Entity('tb_linhas')
export class LineEntity extends BaseEntity {
  /** Columns */
  @Column()
  nome: string;

  @Column({ nullable: true })
  canal_youtube?: string;

  /** Joins */

  @ManyToOne(() => CategoryEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'categoria',
    referencedColumnName: 'id',
  })
  categoria: number;

  /** Methods */
}
