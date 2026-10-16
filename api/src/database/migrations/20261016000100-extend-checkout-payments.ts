import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class ExtendCheckoutPayments20261016000100 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('checkout_links', new TableColumn({
      name: 'description', type: 'varchar', length: '255', isNullable: true,
    }))

    for (const column of [
      new TableColumn({ name: 'attempt_key', type: 'varchar', length: '36', isNullable: true }),
      new TableColumn({ name: 'pix_emv', type: 'text', isNullable: true }),
      new TableColumn({ name: 'pix_qr_code_base64', type: 'mediumtext', isNullable: true }),
      new TableColumn({ name: 'pix_txid', type: 'varchar', length: '120', isNullable: true }),
      new TableColumn({ name: 'card_brand', type: 'varchar', length: '32', isNullable: true }),
      new TableColumn({ name: 'installments', type: 'tinyint', unsigned: true, isNullable: true }),
      new TableColumn({ name: 'fee_percent', type: 'decimal', precision: 7, scale: 4, isNullable: true }),
    ]) {
      await queryRunner.addColumn('orders', column)
    }
    await queryRunner.createIndex('orders', new TableIndex({
      name: 'uq_orders_link_attempt', columnNames: ['checkout_link_id', 'attempt_key'], isUnique: true,
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('orders', 'uq_orders_link_attempt')
    for (const column of ['fee_percent', 'installments', 'card_brand', 'pix_txid', 'pix_qr_code_base64', 'pix_emv', 'attempt_key']) {
      await queryRunner.dropColumn('orders', column)
    }
    await queryRunner.dropColumn('checkout_links', 'description')
  }
}
