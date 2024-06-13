import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { LineEntity } from '@/modules/lines/entities/lines.entity';

@Entity('tb_giras')
export class GirasEntity extends BaseEntity {
  /** Columns */
  @Column()
  gira: string;

  @Column({ type: 'bool' })
  fechada: boolean;

  /** Joins */
  @OneToMany(() => GirasLinhasEntity, linha => linha.gira)
  linhas?: GirasLinhasEntity[];

  /** Methods */
}

@Entity('tb_giras_linhas')
export class GirasLinhasEntity extends BaseEntity {
  /** Columns */
  @Column({ type: 'bool' })
  festa: boolean;

  /** Joins */
  @ManyToOne(() => GirasEntity, gira => gira.linhas, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'gira',
    referencedColumnName: 'id',
  })
  gira: number;

  @ManyToOne(() => LineEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'linha',
    referencedColumnName: 'id',
  })
  linha: number;

  /** Methods */
}
