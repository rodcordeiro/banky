import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterTbLinhas1715255795000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tb_linhas',
      new TableColumn({
        name: 'canal_youtube',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tb_linhas', 'canal_youtube');
  }
}
