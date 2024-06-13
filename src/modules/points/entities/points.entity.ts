import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { LineEntity } from '@/modules/lines/entities/lines.entity';
import { RythmEntity } from '@/modules/rythms/entities/rythtms.entity';

@Entity('tb_pontos')
export class PointsEntity extends BaseEntity {
  /** Columns */
  @Column()
  letra: string;

  @Column()
  audio_url?: string;

  /** Joins */

  @ManyToOne(() => LineEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'linha',
    referencedColumnName: 'id',
  })
  linha: LineEntity;

  @ManyToOne(() => RythmEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'ritmo',
    referencedColumnName: 'id',
  })
  ritmo: number;

  /** Methods */
}
