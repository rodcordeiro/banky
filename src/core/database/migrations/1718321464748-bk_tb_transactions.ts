import { MigrationInterface, QueryRunner,Table,TableForeignKey } from "typeorm";

export class BkTbTransactions1718321464748 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
          new Table({
            name: 'bk_tb_transactions',
            columns: [
              {
                name: 'id',
                type: 'varchar',
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'uuid',
              },
              {
                name: 'description',
                type: 'varchar',
              },
              {
                name: 'value',
                type: 'double',
              },
              {
                name: 'owner',
                type: 'varchar',
              },
              {
                name: 'paymentType',
                type: 'varchar',
              },
              {
                name: 'category',
                type: 'varchar',
              },
              {
                name: 'account',
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
          'bk_tb_user',
          new TableForeignKey({
            columnNames: ['owner'],
            referencedColumnNames: ['id'],
            referencedTableName: 'bk_tb_user',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_transaction_owner',
          }),
        );
        await queryRunner.createForeignKey(
          'bk_tb_payments',
          new TableForeignKey({
            columnNames: ['paymentType'],
            referencedColumnNames: ['id'],
            referencedTableName: 'bk_tb_payments',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_transaction_payment_type',
          }),
        );
        await queryRunner.createForeignKey(
          'bk_tb_categories',
          new TableForeignKey({
            columnNames: ['category'],
            referencedColumnNames: ['id'],
            referencedTableName: 'bk_tb_categories',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_transaction_category',
          }),
        );
        await queryRunner.createForeignKey(
          'bk_tb_accounts',
          new TableForeignKey({
            columnNames: ['account'],
            referencedColumnNames: ['id'],
            referencedTableName: 'bk_tb_accounts',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_transaction_account',
          }),
        );
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('bk_tb_transactions','FK_transaction_owner');
        await queryRunner.dropForeignKey('bk_tb_transactions','FK_transaction_paument_type');
        await queryRunner.dropForeignKey('bk_tb_transactions','FK_transaction_category');
        await queryRunner.dropForeignKey('bk_tb_transactions','FK_transaction_account');
        await queryRunner.dropTable('bk_tb_transactions');
      }


}
