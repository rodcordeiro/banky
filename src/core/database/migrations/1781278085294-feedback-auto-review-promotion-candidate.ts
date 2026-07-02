import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class FeedbackAutoReviewPromotionCandidate1781278085294 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bk_tb_feedback_auto_review_promotion_candidate',
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
            name: 'type',
            type: 'enum',
            enum: ['alias', 'rule', 'threshold', 'model', 'operational_policy'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'candidate',
              'shadow_validated',
              'approved',
              'rejected',
              'active',
              'rolled_back',
            ],
          },
          {
            name: 'origin',
            type: 'enum',
            enum: [
              'human_divergence',
              'shadow_comparison',
              'metric_regression',
              'alias_suggestion',
              'training_run',
              'manual_adjustment',
            ],
          },
          {
            name: 'candidateVersion',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'baseReviewVersion',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'evidence',
            type: 'json',
          },
          {
            name: 'expectedImpact',
            type: 'json',
          },
          {
            name: 'knownRisk',
            type: 'json',
          },
          {
            name: 'rollbackPlan',
            type: 'json',
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'approvedBy',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'rejectedBy',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'appliedBy',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'rolledBackBy',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'approvedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'rejectedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'appliedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'rolledBackAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'rollbackReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
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
      'bk_tb_feedback_auto_review_promotion_candidate',
      new TableIndex({
        name: 'IDX_feedback_auto_review_candidate_version',
        columnNames: ['owner', 'candidateVersion'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'bk_tb_feedback_auto_review_promotion_candidate',
      'IDX_feedback_auto_review_candidate_version',
    );
    await queryRunner.dropTable(
      'bk_tb_feedback_auto_review_promotion_candidate',
    );
  }
}
