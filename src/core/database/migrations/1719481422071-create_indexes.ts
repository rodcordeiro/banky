import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateIndexes1719481422071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'bk_tb_categories',
      new TableIndex({
        name: 'idx_category_positive',
        columnNames: ['id', 'positive'],
      }),
    );
    await queryRunner.createIndex(
      'bk_tb_transactions',
      new TableIndex({
        name: 'idx_account_transaction',
        columnNames: ['id', 'account'],
      }),
    );
    await queryRunner.createIndex(
      'bk_tb_transactions',
      new TableIndex({
        name: 'idx_category_transaction',
        columnNames: ['id', 'category'],
      }),
    );
    await queryRunner.createIndex(
      'bk_tb_transactions',
      new TableIndex({
        name: 'idx_account_category',
        columnNames: ['account', 'category'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bk_tb_categories', 'idx_category_positive');
    await queryRunner.dropIndex(
      'bk_tb_transactions',
      'idx_account_transaction',
    );
    await queryRunner.dropIndex(
      'bk_tb_transactions',
      'idx_category_transaction',
    );
    await queryRunner.dropIndex('bk_tb_transactions', 'idx_account_category');
  }
}
