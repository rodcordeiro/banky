import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class NlpFeedbackEntity1781278085291 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bk_tb_feedback',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'owner',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'originalText',
            type: 'text',
          },
          {
            name: 'predictedIntent',
            type: 'text',
          },
          {
            name: 'correctedIntent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'predictedAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'correctedAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'predictedOriginAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'correctedOriginAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'predictedDestinyAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'correctedDestinyAccount',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'predictedCategory',
            type: 'text',
          },
          {
            name: 'correctedCategory',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'predictedValue',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'correctedValue',
            type: 'decimal',
            precision: 18,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'predictedDate',
            type: 'text',
          },
          {
            name: 'correctedDate',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'validated', 'corrected'],
            default: "'pending'",
          },
          {
            name: 'usedForTraining',
            type: 'tinyint',
            default: 0,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bk_tb_feedback');
  }
}
