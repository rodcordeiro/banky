import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'bk_tb_transactions';
const INDEX = 'idx_category_date_value';

/**
 * Creates the (category, date DESC, value) index that originally lived in
 * CreateIndexes1719481422071, which ran before the `date` column existed.
 * Guarded so environments that already have the index are left untouched.
 */
export class CategoryDateValueIndex1781278085297 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(TABLE);
    if (table?.indices.some(i => i.name === INDEX)) return;
    await queryRunner.query(
      `CREATE INDEX \`${INDEX}\` ON \`${TABLE}\` (\`category\`, \`date\` DESC, \`value\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(TABLE);
    if (!table?.indices.some(i => i.name === INDEX)) return;
    await queryRunner.query(`DROP INDEX \`${INDEX}\` ON \`${TABLE}\``);
  }
}
