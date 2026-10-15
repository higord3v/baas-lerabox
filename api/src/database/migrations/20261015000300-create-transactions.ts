import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateTransactions20261015000300 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'order_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'gateway_transaction_id', type: 'varchar', length: '120' },
          {
            name: 'external_reference',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'amount_cents', type: 'int', unsigned: true },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'occurred_at', type: 'datetime', precision: 6 },
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
            name: 'uq_transactions_user_gateway_id',
            columnNames: ['user_id', 'gateway_transaction_id'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_transactions_user_status',
            columnNames: ['user_id', 'status'],
          }),
          new TableIndex({
            name: 'idx_transactions_order_id',
            columnNames: ['order_id'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_transactions_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
          new TableForeignKey({
            name: 'fk_transactions_order',
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions')
  }
}
