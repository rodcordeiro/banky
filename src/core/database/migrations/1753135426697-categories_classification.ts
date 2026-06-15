import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class CategoriesClassification1753135426697 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_categories',
      new TableColumn({
        name: 'classification',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_categories', 'classification');
  }
}
