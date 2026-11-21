import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'bk_tb_user';
const COLUMN = 'refreshToken';

/**
 * The refresh token is a JWT whose payload is encrypted, so it is longer than
 * the varchar(255) created by TbUsers1706130140618 (ER_DATA_TOO_LONG on login).
 * Guarded so databases where the column is already TEXT are left untouched.
 */
export class UserRefreshTokenText1781278085298 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(TABLE);
    const column = table?.findColumnByName(COLUMN);
    if (column && /text$/i.test(column.type)) return;
    await queryRunner.query(
      `ALTER TABLE \`${TABLE}\` MODIFY \`${COLUMN}\` TEXT NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Tokens longer than the old limit cannot fit; clearing forces a new login.
    await queryRunner.query(
      `UPDATE \`${TABLE}\` SET \`${COLUMN}\` = '' WHERE CHAR_LENGTH(\`${COLUMN}\`) > 255`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${TABLE}\` MODIFY \`${COLUMN}\` varchar(255) NOT NULL`,
    );
  }
}
