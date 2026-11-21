import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class FeedbackAutoReviewEffectiveAlias1781278085296 implements MigrationInterface {
  private readonly table = 'bk_tb_feedback_auto_review_effective_alias';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable(this.table);
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: this.table,
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'owner',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'field',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'pattern',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'canonicalValue',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'runtimeStatus',
            type: 'enum',
            enum: ['active', 'inactive', 'paused'],
            default: "'active'",
          },
          {
            name: 'candidateVersion',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'previousVersion',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'activatedBy',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'activatedAt',
            type: 'datetime',
          },
          {
            name: 'deactivatedBy',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'deactivatedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'deactivationKind',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      this.table,
      new TableIndex({
        name: 'IDX_effective_alias_owner_field_pattern_canonical',
        columnNames: ['owner', 'field', 'pattern', 'canonicalValue'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      this.table,
      new TableIndex({
        name: 'IDX_effective_alias_owner_candidate',
        columnNames: ['owner', 'candidateVersion'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable(this.table);
    if (!exists) {
      return;
    }
    await queryRunner.dropTable(this.table);
  }
}
