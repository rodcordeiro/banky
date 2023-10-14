import { Column, Entity, BeforeInsert, OneToMany, JoinColumn } from 'typeorm';
import { hashSync } from 'bcrypt';

import { BaseEntity } from '@/common/entities/base.entity';

import { AccountsEntity } from '@/modules/accounts/entities/accounts.entity';

@Entity({ name: 'banky_tb_users' })
export class UsersEntity extends BaseEntity {
  /** Columns */

  @Column()
  name: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  refreshToken: string;

  /** Joins */
  @OneToMany(() => AccountsEntity, account => account.owner)
  @JoinColumn()
  accounts: AccountsEntity[];

  /** Methods */
  @BeforeInsert()
  hash() {
    this.password = hashSync(this.password, 10);
  }
}
