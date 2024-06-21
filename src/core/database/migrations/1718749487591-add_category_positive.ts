import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryPositive1718749487591 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_categories',
      new TableColumn({
        name: 'positive',
        type: 'tinyint',
        length: '1',
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_categories', 'positive');
  }
}
