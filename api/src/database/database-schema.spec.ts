import { getMetadataArgsStorage, QueryRunner, Table } from 'typeorm'
import { databaseOptions } from './database-options.js'
import { CreateUsersAndGatewayAccounts20261015000100 } from './migrations/20261015000100-create-users-and-gateway-accounts.js'
import { CreateCheckoutLinksAndOrders20261015000200 } from './migrations/20261015000200-create-checkout-links-and-orders.js'
import { CreateTransactions20261015000300 } from './migrations/20261015000300-create-transactions.js'
import { CreateWithdrawals20261015000400 } from './migrations/20261015000400-create-withdrawals.js'
import { CreateWebhookEvents20261015000500 } from './migrations/20261015000500-create-webhook-events.js'

describe('database migrations', () => {
  it('keeps tenant filtering indexes composite and disables schema synchronization', () => {
    expect(databaseOptions.synchronize).toBe(false)

    const indexes = getMetadataArgsStorage().indices
    for (const name of [
      'idx_checkout_links_user_status',
      'idx_orders_user_status',
      'idx_transactions_user_status',
      'idx_withdrawals_user_status',
    ]) {
      expect(indexes.find((index) => index.name === name)?.columns).toEqual([
        'userId',
        'status',
      ])
    }
  })

  it('creates every required table with integer monetary columns and tenant references', async () => {
    const createdTables: Table[] = []
    const queryRunner = {
      createTable: async (table: Table) => {
        createdTables.push(table)
      },
    } as unknown as QueryRunner

    await new CreateUsersAndGatewayAccounts20261015000100().up(queryRunner)
    await new CreateCheckoutLinksAndOrders20261015000200().up(queryRunner)
    await new CreateTransactions20261015000300().up(queryRunner)
    await new CreateWithdrawals20261015000400().up(queryRunner)
    await new CreateWebhookEvents20261015000500().up(queryRunner)

    expect(createdTables.map((table) => table.name)).toEqual([
      'users',
      'gateway_accounts',
      'checkout_links',
      'orders',
      'transactions',
      'withdrawals',
      'webhook_events',
    ])

    for (const table of createdTables.filter((item) => item.name !== 'users')) {
      expect(table.columns.some((column) => column.name === 'user_id')).toBe(
        true,
      )
      expect(
        table.foreignKeys.some((key) => key.columnNames.includes('user_id')),
      ).toBe(true)
    }

    for (const table of createdTables.filter((item) =>
      ['checkout_links', 'orders', 'transactions', 'withdrawals'].includes(
        item.name,
      ),
    )) {
      expect(
        table.columns.find((column) => column.name === 'amount_cents'),
      ).toMatchObject({
        type: 'int',
        unsigned: true,
      })
    }

    expect(
      createdTables.find((table) => table.name === 'webhook_events')?.indices,
    ).toContainEqual(
      expect.objectContaining({
        name: 'uq_webhook_events_user_event_key',
        isUnique: true,
        columnNames: ['user_id', 'event_key'],
      }),
    )
  })
})
