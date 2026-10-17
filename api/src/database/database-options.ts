import type { DataSourceOptions } from 'typeorm'
import { CheckoutLink } from './entities/checkout-link.entity.js'
import { GatewayAccount } from './entities/gateway-account.entity.js'
import { Order } from './entities/order.entity.js'
import { Transaction } from './entities/transaction.entity.js'
import { User } from './entities/user.entity.js'
import { WebhookEvent } from './entities/webhook-event.entity.js'
import { WebhookSubscription } from './entities/webhook-subscription.entity.js'
import { Withdrawal } from './entities/withdrawal.entity.js'
import { CreateUsersAndGatewayAccounts20261015000100 } from './migrations/20261015000100-create-users-and-gateway-accounts.js'
import { CreateCheckoutLinksAndOrders20261015000200 } from './migrations/20261015000200-create-checkout-links-and-orders.js'
import { CreateTransactions20261015000300 } from './migrations/20261015000300-create-transactions.js'
import { CreateWithdrawals20261015000400 } from './migrations/20261015000400-create-withdrawals.js'
import { CreateWebhookEvents20261015000500 } from './migrations/20261015000500-create-webhook-events.js'
import { EncryptGatewayStoreKey20261015000600 } from './migrations/20261015000600-encrypt-gateway-store-key.js'
import { ExtendCheckoutPayments20261016000100 } from './migrations/20261016000100-extend-checkout-payments.js'
import { WebhookSubscriptions20261016000200 } from './migrations/20261016000200-webhook-subscriptions.js'
import { WebhookRegistrationState20261016000300 } from './migrations/20261016000300-webhook-registration-state.js'

export const databaseOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'baas',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'baas',
  synchronize: false,
  entities: [
    User,
    GatewayAccount,
    CheckoutLink,
    Order,
    Transaction,
    Withdrawal,
    WebhookEvent,
    WebhookSubscription,
  ],
  migrations: [
    CreateUsersAndGatewayAccounts20261015000100,
    CreateCheckoutLinksAndOrders20261015000200,
    CreateTransactions20261015000300,
    CreateWithdrawals20261015000400,
    CreateWebhookEvents20261015000500,
    EncryptGatewayStoreKey20261015000600,
    ExtendCheckoutPayments20261016000100,
    WebhookSubscriptions20261016000200,
    WebhookRegistrationState20261016000300,
  ],
}
