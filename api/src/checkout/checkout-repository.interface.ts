import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY')

export interface CheckoutRepositoryPort {
  saveLink(link: CheckoutLink): Promise<CheckoutLink>
  findLink(id: string): Promise<CheckoutLink | null>
  findOwnedLink(id: string, userId: string): Promise<CheckoutLink | null>
  findOwnedLinks(userId: string): Promise<CheckoutLink[]>
  createAttempt(linkId: string, attemptKey: string): Promise<{ order: Order; created: boolean }>
  findAttempt(linkId: string, attemptKey: string): Promise<Order | null>
  findOrder(linkId: string, orderId: string): Promise<Order | null>
  attachGatewayPayment(order: Order): Promise<void>
  removeRejectedAttempt(orderId: string): Promise<void>
  confirmPayment(orderId: string, status: Order['status']): Promise<void>
}
