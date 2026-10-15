import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateCheckoutLinksAndOrders20261015000200 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'checkout_links',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'external_reference', type: 'varchar', length: '120' },
          { name: 'amount_cents', type: 'int', unsigned: true },
          { name: 'method', type: 'varchar', length: '16' },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'ACTIVE'",
          },
          {
            name: 'card_brand',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'installments',
            type: 'tinyint',
            unsigned: true,
            isNullable: true,
          },
          {
            name: 'fee_percent',
            type: 'decimal',
            precision: 7,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'datetime',
            precision: 6,
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
            name: 'uq_checkout_links_user_reference',
            columnNames: ['user_id', 'external_reference'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_checkout_links_user_status',
            columnNames: ['user_id', 'status'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_checkout_links_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
    )

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'checkout_link_id', type: 'varchar', length: '36' },
          { name: 'external_reference', type: 'varchar', length: '120' },
          {
            name: 'gateway_payment_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'amount_cents', type: 'int', unsigned: true },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'PENDING'",
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
            name: 'uq_orders_user_reference',
            columnNames: ['user_id', 'external_reference'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'uq_orders_gateway_payment_id',
            columnNames: ['gateway_payment_id'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_orders_user_status',
            columnNames: ['user_id', 'status'],
          }),
          new TableIndex({
            name: 'idx_orders_checkout_link_id',
            columnNames: ['checkout_link_id'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_orders_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
          new TableForeignKey({
            name: 'fk_orders_checkout_link',
            columnNames: ['checkout_link_id'],
            referencedTableName: 'checkout_links',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('orders')
    await queryRunner.dropTable('checkout_links')
  }
}
