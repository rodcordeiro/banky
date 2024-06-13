import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class TbLines1715076004763 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_linhas',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nome',
            type: 'varchar',
            isUnique: true,
          },
          { name: 'categoria', type: 'int' },
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
      'tb_linhas',
      new TableForeignKey({
        columnNames: ['categoria'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tb_categorias',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_linha_categoria',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('tb_linhas', 'FK_linha_categoria');
    await queryRunner.dropTable('tb_linhas');
  }
}
