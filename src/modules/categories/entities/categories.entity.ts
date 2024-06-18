import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';

@Entity('bk_tb_categories')
export class CategoriesEntity extends BaseEntity {
  /** Columns */

  @Column()
  name: string;

  @Column({
    type: 'bool',
  })
  positive: boolean;

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
