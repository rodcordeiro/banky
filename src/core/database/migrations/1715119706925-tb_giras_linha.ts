import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class TbGirasLinha1715119706925 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_giras_linhas',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'linha',
            type: 'int',
          },
          { name: 'gira', type: 'int' },
          { name: 'festa', type: 'tinyint', length: '1' },
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
      'tb_giras_linhas',
      new TableForeignKey({
        columnNames: ['linha'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tb_linhas',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_linha_linha',
      }),
    );
    await queryRunner.createForeignKey(
      'tb_giras_linhas',
      new TableForeignKey({
        columnNames: ['gira'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tb_giras',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_gira_linha',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('tb_giras_linhas', 'FK_gira_linha');
    await queryRunner.dropForeignKey('tb_giras_linhas', 'FK_linha_linha');
    await queryRunner.dropTable('tb_giras_linhas');
  }
}
