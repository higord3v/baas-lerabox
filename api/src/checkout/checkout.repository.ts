import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { CheckoutRepositoryPort } from './checkout-repository.interface.js'

@Injectable()
export class CheckoutRepository implements CheckoutRepositoryPort {
  constructor(
    @InjectRepository(CheckoutLink) private readonly links: Repository<CheckoutLink>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  saveLink(link: CheckoutLink): Promise<CheckoutLink> {
    return this.links.save(link)
  }

  findLink(id: string): Promise<CheckoutLink | null> {
    return this.links.findOne({ where: { id } })
  }

  findOwnedLink(id: string, userId: string): Promise<CheckoutLink | null> {
    return this.links.findOne({ where: { id, userId } })
  }

  findOwnedLinks(userId: string): Promise<CheckoutLink[]> {
    return this.links.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  createAttempt(linkId: string, attemptKey: string): Promise<{ order: Order; created: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const links = manager.getRepository(CheckoutLink)
      const orders = manager.getRepository(Order)
      const link = await links.findOne({ where: { id: linkId }, lock: { mode: 'pessimistic_write' } })
      if (!link) throw new NotFoundException('Link não encontrado')
      const existing = await orders.findOne({ where: { checkoutLinkId: linkId, attemptKey } })
      if (existing) return { order: existing, created: false }
      if (link.status !== 'ACTIVE') throw new ConflictException('Link indisponível')
      if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('Link expirado')
      const pending = await orders.findOne({ where: { checkoutLinkId: linkId, status: 'PENDING' } })
      if (pending) throw new ConflictException('Existe um pagamento em processamento para este link')

      const order = orders.create({
        userId: link.userId,
        checkoutLinkId: link.id,
        attemptKey,
        externalReference: `ORD-${randomUUID()}`,
        amountCents: link.amountCents,
        status: 'PENDING',
        gatewayPaymentId: null,
        pixEmv: null,
        pixQrCodeBase64: null,
        pixTxid: null,
        cardBrand: link.cardBrand,
        installments: link.installments,
        feePercent: link.feePercent,
      })
      return { order: await orders.save(order), created: true }
    })
  }

  findOrder(linkId: string, orderId: string): Promise<Order | null> {
    return this.orders.findOne({ where: { id: orderId, checkoutLinkId: linkId } })
  }

  findAttempt(linkId: string, attemptKey: string): Promise<Order | null> {
    return this.orders.findOne({ where: { checkoutLinkId: linkId, attemptKey } })
  }

  async attachGatewayPayment(order: Order): Promise<void> {
    await this.orders.update({ id: order.id }, {
      gatewayPaymentId: order.gatewayPaymentId,
      pixEmv: order.pixEmv,
      pixQrCodeBase64: order.pixQrCodeBase64,
      pixTxid: order.pixTxid,
    })
  }

  async removeRejectedAttempt(orderId: string): Promise<void> {
    await this.orders.delete({ id: orderId, gatewayPaymentId: IsNull() })
  }

  async confirmPayment(orderId: string, status: Order['status']): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(Order)
      const links = manager.getRepository(CheckoutLink)
      const current = await orders.findOne({ where: { id: orderId } })
      if (!current || current.status !== 'PENDING') return
      const link = await links.findOne({ where: { id: current.checkoutLinkId }, lock: { mode: 'pessimistic_write' } })
      const order = await orders.findOne({ where: { id: orderId }, lock: { mode: 'pessimistic_write' } })
      if (!order || order.status !== 'PENDING') return
      order.status = status
      await orders.save(order)
      if (status === 'APPROVED' && link) {
        link.status = 'PAID'
        await links.save(link)
      }
    })
  }
}
