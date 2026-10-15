import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class EncryptGatewayStoreKey20261015000600 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('gateway_accounts', 'store_key', new TableColumn({
      name: 'store_key', type: 'text',
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('gateway_accounts', 'store_key', new TableColumn({
      name: 'store_key', type: 'varchar', length: '255',
    }))
  }
}
