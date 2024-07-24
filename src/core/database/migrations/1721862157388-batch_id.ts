import { MigrationInterface, TableColumn, QueryRunner } from 'typeorm';

export class BatchId1721862157388 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_transactions',
      new TableColumn({
        name: 'batch_id',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_transactions', 'batch_id');
  }
}
