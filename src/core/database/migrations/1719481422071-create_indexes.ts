import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const INDEXES: Array<{ table: string; index: TableIndex }> = [
  {
    table: 'bk_tb_categories',
    index: new TableIndex({
      name: 'idx_category_positive',
      columnNames: ['id', 'positive'],
    }),
  },
  {
    table: 'bk_tb_transactions',
    index: new TableIndex({
      name: 'idx_account_transaction',
      columnNames: ['account'],
    }),
  },
  {
    table: 'bk_tb_transactions',
    index: new TableIndex({
      name: 'idx_category_transaction',
      columnNames: ['category'],
    }),
  },
  {
    table: 'bk_tb_transactions',
    index: new TableIndex({
      name: 'idx_account_category',
      columnNames: ['account', 'category'],
    }),
  },
];

/**
 * MySQL DDL is not transactional, so a partial failure leaves indexes behind.
 * Each index is created only when missing so the migration can be retried.
 *
 * `idx_category_date_value` was moved to CategoryDateValueIndex1781278085297
 * because `bk_tb_transactions.date` only exists after TransactionDate1720644096008.
 */
export class CreateIndexes1719481422071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, index } of INDEXES) {
      const current = await queryRunner.getTable(table);
      if (current?.indices.some(i => i.name === index.name)) continue;
      await queryRunner.createIndex(table, index);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, index } of [...INDEXES].reverse()) {
      const current = await queryRunner.getTable(table);
      if (!current?.indices.some(i => i.name === index.name)) continue;
      await queryRunner.dropIndex(table, index.name);
    }
  }
}
