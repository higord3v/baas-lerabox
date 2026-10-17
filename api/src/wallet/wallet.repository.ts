import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, LessThanOrEqual, Repository } from 'typeorm'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { LocalStatementQuery, WalletRepositoryPort } from './wallet-repository.interface.js'

@Injectable()
export class WalletRepository implements WalletRepositoryPort {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(CheckoutLink) private readonly links: Repository<CheckoutLink>,
  ) {}

  findOrders(userId: string, query: LocalStatementQuery): Promise<Order[]> {
    return this.orders.find({
      where: {
        userId,
        status: query.status ?? In(['PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CANCELLED']),
        ...(query.method ? { checkoutLink: { method: query.method } } : {}),
      },
      relations: { checkoutLink: true },
      order: { updatedAt: 'DESC' },
      take: query.limit,
    })
  }

  findClosedLinks(userId: string, query: LocalStatementQuery): Promise<CheckoutLink[]> {
    const method = query.method ? { method: query.method } : {}
    const where = query.status === 'CANCELLED' ? [{ userId, status: 'CANCELLED' as const, ...method }]
      : query.status === 'EXPIRED' ? [
        { userId, status: 'EXPIRED' as const, ...method },
        { userId, status: 'ACTIVE' as const, expiresAt: LessThanOrEqual(new Date()), ...method },
      ] : [
        { userId, status: In(['EXPIRED', 'CANCELLED']), ...method },
        { userId, status: 'ACTIVE' as const, expiresAt: LessThanOrEqual(new Date()), ...method },
      ]
    return this.links.find({
      where,
      order: { updatedAt: 'DESC' },
      take: query.limit,
    })
  }
}
