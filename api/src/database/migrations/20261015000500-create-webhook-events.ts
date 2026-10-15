import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateWebhookEvents20261015000500 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_events',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'event_key', type: 'varchar', length: '128' },
          { name: 'event_type', type: 'varchar', length: '32' },
          {
            name: 'external_reference',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'payload', type: 'json' },
          {
            name: 'processing_status',
            type: 'varchar',
            length: '16',
            default: "'RECEIVED'",
          },
          {
            name: 'processed_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        indices: [
          new TableIndex({
            name: 'uq_webhook_events_user_event_key',
            columnNames: ['user_id', 'event_key'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_webhook_events_user_reference',
            columnNames: ['user_id', 'external_reference'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_webhook_events_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_events')
  }
}
