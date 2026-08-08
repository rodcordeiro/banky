import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Garante colunas de auditoria do ciclo de promocao quando a tabela
 * foi criada antes (createTable ifNotExists) sem o schema completo.
 */
export class FeedbackAutoReviewPromotionCandidateAuditColumns1781278085295 implements MigrationInterface {
  private readonly table = 'bk_tb_feedback_auto_review_promotion_candidate';

  private readonly columns: TableColumn[] = [
    new TableColumn({
      name: 'approvedBy',
      type: 'varchar',
      length: '64',
      isNullable: true,
    }),
    new TableColumn({
      name: 'rejectedBy',
      type: 'varchar',
      length: '64',
      isNullable: true,
    }),
    new TableColumn({
      name: 'appliedBy',
      type: 'varchar',
      length: '64',
      isNullable: true,
    }),
    new TableColumn({
      name: 'rolledBackBy',
      type: 'varchar',
      length: '64',
      isNullable: true,
    }),
    new TableColumn({
      name: 'approvedAt',
      type: 'datetime',
      isNullable: true,
    }),
    new TableColumn({
      name: 'rejectedAt',
      type: 'datetime',
      isNullable: true,
    }),
    new TableColumn({
      name: 'appliedAt',
      type: 'datetime',
      isNullable: true,
    }),
    new TableColumn({
      name: 'rolledBackAt',
      type: 'datetime',
      isNullable: true,
    }),
    new TableColumn({
      name: 'rollbackReason',
      type: 'text',
      isNullable: true,
    }),
    new TableColumn({
      name: 'notes',
      type: 'text',
      isNullable: true,
    }),
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.table);
    if (!table) {
      return;
    }

    for (const column of this.columns) {
      if (table.findColumnByName(column.name)) {
        continue;
      }

      await queryRunner.addColumn(this.table, column);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.table);
    if (!table) {
      return;
    }

    for (const column of [...this.columns].reverse()) {
      if (!table.findColumnByName(column.name)) {
        continue;
      }

      await queryRunner.dropColumn(this.table, column.name);
    }
  }
}
