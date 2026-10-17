import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm'

export class WebhookSubscriptions20261016000200 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'webhook_subscriptions',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'user_id', type: 'varchar', length: '36' },
        { name: 'event_type', type: 'varchar', length: '32' },
        { name: 'callback_url', type: 'varchar', length: '2048' },
        { name: 'encrypted_secret', type: 'text' },
        { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
      ],
      indices: [new TableIndex({ name: 'uq_webhook_subscriptions_user_event', columnNames: ['user_id', 'event_type'], isUnique: true })],
      foreignKeys: [new TableForeignKey({ name: 'fk_webhook_subscriptions_user', columnNames: ['user_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' })],
    }))
    await queryRunner.addColumn('webhook_events', new TableColumn({ name: 'signature_valid', type: 'boolean', default: false }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('webhook_events', 'signature_valid')
    await queryRunner.dropTable('webhook_subscriptions')
  }
}
