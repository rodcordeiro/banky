import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AccountThreshold1718675728251 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_accounts',
      new TableColumn({ name: 'threshold', type: 'double', isNullable: false }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_accounts', 'threshold');
  }
}
