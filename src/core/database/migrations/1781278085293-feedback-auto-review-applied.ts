import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FeedbackAutoReviewApplied1781278085293 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bk_tb_feedback_auto_review',
      new TableColumn({
        name: 'applied',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'bk_tb_feedback_auto_review',
      new TableColumn({
        name: 'appliedAt',
        type: 'datetime',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bk_tb_feedback_auto_review', 'appliedAt');
    await queryRunner.dropColumn('bk_tb_feedback_auto_review', 'applied');
  }
}
