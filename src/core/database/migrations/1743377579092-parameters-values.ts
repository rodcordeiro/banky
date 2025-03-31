import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class ParametersValues1743377579092 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bk_tb_parameter_values',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'parameter',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'owner',
            type: 'varchar',
          },
          {
            name: 'value',
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
      'bk_tb_parameter_values',
      new TableForeignKey({
        columnNames: ['owner'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bk_tb_user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_parameter_owner',
      }),
    );
    await queryRunner.createForeignKey(
      'bk_tb_parameter_values',
      new TableForeignKey({
        columnNames: ['parameter'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bk_tb_parameters',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_parameter_value',
      }),
    );
    await queryRunner.createIndex(
      'bk_tb_parameter_values',
      new TableIndex({
        name: 'idx_parameter_owner',
        columnNames: ['owner'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'bk_tb_parameter_values',
      'idx_parameter_owner',
    );
    await queryRunner.dropForeignKey(
      'bk_tb_parameter_values',
      'FK_parameter_owner',
    );
    await queryRunner.dropForeignKey(
      'bk_tb_parameter_values',
      'FK_parameter_value',
    );
    await queryRunner.dropTable('bk_tb_parameter_values');
  }
}
