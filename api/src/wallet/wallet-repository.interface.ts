import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY')

export interface LocalStatementQuery {
  limit: number
  status?: Order['status']
  method?: CheckoutLink['method']
}

export interface WalletRepositoryPort {
  findOrders(userId: string, query: LocalStatementQuery): Promise<Order[]>
  findClosedLinks(userId: string, query: LocalStatementQuery): Promise<CheckoutLink[]>
}
