import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class TbPontos1715389082193 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_pontos',
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
          { name: 'ritmo', type: 'int' },
          { name: 'letra', type: 'text' },
          { name: 'audio_url', type: 'varchar', isNullable: true },
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
      'tb_pontos',
      new TableForeignKey({
        columnNames: ['linha'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tb_linhas',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_pontos_linha',
      }),
    );
    await queryRunner.createForeignKey(
      'tb_pontos',
      new TableForeignKey({
        columnNames: ['ritmo'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tb_ritmos',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_pontos_ritmo',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('tb_pontos', 'FK_pontos_linha');
    await queryRunner.dropForeignKey('tb_pontos_ritmo', 'FK_pontos_ritmo');
    await queryRunner.dropTable('tb_prontos');
  }
}
