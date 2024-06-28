import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateCategoryIndex1719511574040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'bk_tb_categories',
      new TableIndex({
        name: 'idx_category_subcategory',
        columnNames: ['id', 'category'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bk_tb_categories', 'idx_category_subcategory');
  }
}
