import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class TransactionDate1720644096008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_transactions',
      new TableColumn({
        name: 'date',
        type: 'timestamp',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_transactions', 'date');
  }
}
