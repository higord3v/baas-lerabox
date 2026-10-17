import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { Order } from '../database/entities/order.entity.js'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { WebhookEvent } from '../database/entities/webhook-event.entity.js'
import { WebhookSubscription } from '../database/entities/webhook-subscription.entity.js'
import { WebhookPayload } from './webhook-payload.js'
import { WebhooksRepositoryPort } from './webhooks-repository.interface.js'

@Injectable()
export class WebhooksRepository implements WebhooksRepositoryPort {
  constructor(
    @InjectRepository(WebhookSubscription) private readonly subscriptions: Repository<WebhookSubscription>,
    @InjectRepository(WebhookEvent) private readonly events: Repository<WebhookEvent>,
    private readonly dataSource: DataSource,
  ) {}

  findSubscription(id: string): Promise<WebhookSubscription | null> {
    return this.subscriptions.createQueryBuilder('subscription')
      .addSelect('subscription.encryptedSecret').where('subscription.id = :id', { id }).getOne()
  }

  findOwnedSubscription(userId: string, event: WebhookSubscription['eventType']): Promise<WebhookSubscription | null> {
    return this.subscriptions.createQueryBuilder('subscription').addSelect('subscription.encryptedSecret')
      .where('subscription.userId = :userId', { userId }).andWhere('subscription.eventType = :event', { event }).getOne()
  }

  listSubscriptions(userId: string): Promise<WebhookSubscription[]> {
    return this.subscriptions.find({ where: { userId }, order: { eventType: 'ASC' } })
  }

  saveSubscription(subscription: WebhookSubscription): Promise<WebhookSubscription> {
    return this.subscriptions.save(subscription)
  }

  async insertEvent(event: WebhookEvent): Promise<void> {
    try {
      await this.events.save(event)
    } catch (error) {
      const cause: unknown = error instanceof QueryFailedError ? error.driverError : null
      if (typeof cause !== 'object' || cause === null || !('code' in cause) || cause.code !== 'ER_DUP_ENTRY') throw error
    }
  }

  async applyEvent(event: WebhookEvent, payload: WebhookPayload): Promise<{ checkoutLinkId: string | null } | null> {
    return this.dataSource.transaction(async (manager) => {
      const events = manager.getRepository(WebhookEvent)
      const current = await events.findOne({ where: { userId: event.userId, eventKey: event.eventKey }, lock: { mode: 'pessimistic_write' } })
      if (!current || current.processingStatus === 'PROCESSED') return null
      let checkoutLinkId: string | null = null
      if (event.eventType === 'WITHDRAWAL') {
        await this.applyWithdrawal(manager.getRepository(Withdrawal), event, payload)
      } else {
        checkoutLinkId = await this.applyPayment(manager.getRepository(Order), manager.getRepository(CheckoutLink), event, payload)
      }
      current.processingStatus = 'PROCESSED'
      current.processedAt = new Date()
      current.errorMessage = null
      await events.save(current)
      return { checkoutLinkId }
    })
  }

  async markFailed(userId: string, eventKey: string, message: string): Promise<void> {
    await this.events.update({ userId, eventKey, processingStatus: 'RECEIVED' }, { processingStatus: 'FAILED', errorMessage: message.slice(0, 500) })
  }

  private async applyPayment(orders: Repository<Order>, links: Repository<CheckoutLink>, event: WebhookEvent, payload: WebhookPayload): Promise<string> {
    const matched = await orders.findOne({ where: payload.externalReference
      ? { userId: event.userId, externalReference: payload.externalReference }
      : { userId: event.userId, gatewayPaymentId: payload.gatewayId! } })
    if (!matched) throw new NotFoundException('Pedido do webhook não encontrado')
    const link = await links.findOne({ where: { id: matched.checkoutLinkId, userId: event.userId }, lock: { mode: 'pessimistic_write' } })
    const order = await orders.findOne({ where: { id: matched.id, userId: event.userId }, lock: { mode: 'pessimistic_write' } })
    if (!order || !link || link.method !== (event.eventType === 'PAYMENT_PIX' ? 'PIX' : 'CARD')
      || (payload.gatewayId && order.gatewayPaymentId && order.gatewayPaymentId !== payload.gatewayId)
      || (payload.amount !== null && order.amountCents !== payload.amount)) {
      throw new UnprocessableEntityException('Pagamento do webhook divergente')
    }
    if (order.status === 'PENDING') {
      order.status = payload.status
      await orders.save(order)
      if (payload.status === 'APPROVED') {
        link.status = 'PAID'
        await links.save(link)
      }
    }
    return link.id
  }

  private async applyWithdrawal(withdrawals: Repository<Withdrawal>, event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    const withdrawal = await withdrawals.findOne({ where: payload.externalReference
      ? { userId: event.userId, externalReference: payload.externalReference }
      : { userId: event.userId, gatewayWithdrawalId: payload.gatewayId! }, lock: { mode: 'pessimistic_write' } })
    if (!withdrawal) throw new NotFoundException('Saque do webhook não encontrado')
    if ((payload.gatewayId && withdrawal.gatewayWithdrawalId && withdrawal.gatewayWithdrawalId !== payload.gatewayId)
      || (payload.amount !== null && withdrawal.amountCents !== payload.amount)) {
      throw new UnprocessableEntityException('Saque do webhook divergente')
    }
    if (withdrawal.status === 'PENDING') {
      withdrawal.status = payload.status
      await withdrawals.save(withdrawal)
    }
  }
}
