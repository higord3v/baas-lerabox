import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateWithdrawals20261015000400 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'withdrawals',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'external_reference', type: 'varchar', length: '120' },
          {
            name: 'gateway_withdrawal_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'amount_cents', type: 'int', unsigned: true },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'PENDING'",
          },
          { name: 'destination_type', type: 'varchar', length: '16' },
          { name: 'encrypted_destination', type: 'text' },
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
            name: 'uq_withdrawals_user_reference',
            columnNames: ['user_id', 'external_reference'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'uq_withdrawals_gateway_id',
            columnNames: ['gateway_withdrawal_id'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_withdrawals_user_status',
            columnNames: ['user_id', 'status'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_withdrawals_user',
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
    await queryRunner.dropTable('withdrawals')
  }
}
