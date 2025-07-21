import { Column, Entity, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { UsersEntity } from '@/modules/users/entities/users.entity';

export enum CategoryClassification {
  // eslint-disable-next-line no-unused-vars
  Essencial = 'essencial',
  // eslint-disable-next-line no-unused-vars
  Important = 'importante',
  // eslint-disable-next-line no-unused-vars
  Optional = 'opcional',
  // eslint-disable-next-line no-unused-vars
  NotControllable = 'nao_controlavel',
}

@Entity('bk_tb_categories')
export class CategoriesEntity extends BaseEntity {
  /** Columns */

  @Column()
  name: string;

  @Column({
    type: 'bool',
  })
  positive: boolean;

  @Column({
    type: 'bool',
    comment:
      'Internal category, like transfer between accounts. Not to be used in reports.',
    default: false,
  })
  internal: boolean;

  @Column({
    type: 'enum',
    enum: CategoryClassification,
    nullable: true,
  })
  classification?: CategoryClassification;

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
  @ManyToOne(() => CategoriesEntity, category => category.subcategories, {
    nullable: true,
  })
  @JoinColumn({
    name: 'category',
    referencedColumnName: 'id',
  })
  category?: string;

  @OneToMany(() => CategoriesEntity, category => category.category, {
    nullable: true,
  })
  subcategories: CategoriesEntity[];
  /** Methods */
}
