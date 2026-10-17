import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class WebhookRegistrationState20261016000300 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('webhook_subscriptions', new TableColumn({
      name: 'registered_at', type: 'datetime', precision: 6, isNullable: true,
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('webhook_subscriptions', 'registered_at')
  }
}
