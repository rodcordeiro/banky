import { MigrationInterface, TableColumn, QueryRunner } from 'typeorm';

export class CategoryUpdate1719538812696 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_categories',
      new TableColumn({
        name: 'internal',
        type: 'tinyint',
        length: '1',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_categories', 'internal');
  }
}
