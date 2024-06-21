import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class BkTbAccounts1718321413380 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bk_tb_accounts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'ammount',
            type: 'double',
          },
          {
            name: 'paymentType',
            type: 'varchar',
          },
          {
            name: 'owner',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'bk_tb_accounts',
      new TableForeignKey({
        columnNames: ['owner'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bk_tb_user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_account_owner',
      }),
    );
    await queryRunner.createForeignKey(
      'bk_tb_accounts',
      new TableForeignKey({
        columnNames: ['paymentType'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bk_tb_payments',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_account_payment_type',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('bk_tb_accounts', 'FK_account_owner');
    await queryRunner.dropForeignKey(
      'bk_tb_accounts',
      'FK_account_payment_type',
    );
    await queryRunner.dropTable('bk_tb_accounts');
  }
}
