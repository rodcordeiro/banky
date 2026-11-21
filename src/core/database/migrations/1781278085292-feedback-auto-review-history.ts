import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class FeedbackAutoReviewHistory1781278085292 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bk_tb_feedback_auto_review',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'feedbackId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'owner',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'mode',
            type: 'enum',
            enum: ['shadow', 'assistive', 'automatic'],
          },
          {
            name: 'decision',
            type: 'enum',
            enum: ['approve', 'correct', 'manual_review', 'reject'],
          },
          {
            name: 'score',
            type: 'double',
          },
          {
            name: 'fieldScores',
            type: 'json',
          },
          {
            name: 'reasons',
            type: 'json',
          },
          {
            name: 'suggestedCorrections',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'reviewVersion',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'evaluatedAt',
            type: 'datetime',
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

    await queryRunner.createIndex(
      'bk_tb_feedback_auto_review',
      new TableIndex({
        name: 'IDX_feedback_auto_review_unique_shadow',
        columnNames: ['feedbackId', 'mode', 'reviewVersion'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'bk_tb_feedback_auto_review',
      'IDX_feedback_auto_review_unique_shadow',
    );
    await queryRunner.dropTable('bk_tb_feedback_auto_review');
  }
}
