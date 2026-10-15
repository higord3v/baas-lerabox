import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateUsersAndGatewayAccounts20261015000100 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'email', type: 'varchar', length: '254' },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'display_name', type: 'varchar', length: '120' },
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
            name: 'uq_users_email',
            columnNames: ['email'],
            isUnique: true,
          }),
        ],
      }),
    )

    await queryRunner.createTable(
      new Table({
        name: 'gateway_accounts',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'customer_code', type: 'varchar', length: '100' },
          { name: 'store_key', type: 'varchar', length: '255' },
          { name: 'encrypted_access_token', type: 'text', isNullable: true },
          {
            name: 'token_expires_at',
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
            name: 'uq_gateway_accounts_user_id',
            columnNames: ['user_id'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'uq_gateway_accounts_customer_code',
            columnNames: ['customer_code'],
            isUnique: true,
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_gateway_accounts_user',
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
    await queryRunner.dropTable('gateway_accounts')
    await queryRunner.dropTable('users')
  }
}
