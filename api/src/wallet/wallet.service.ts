import { Inject, Injectable } from '@nestjs/common'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { GatewayHttpService, GatewayTransaction } from '../gateway/gateway-http.service.js'
import { TransactionsQueryDto } from './dto/transactions-query.dto.js'
import { StatementEntryDto, StatementResponseDto, WalletResponseDto } from './dto/wallet-response.dto.js'
import { WALLET_REPOSITORY, type WalletRepositoryPort } from './wallet-repository.interface.js'

@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly repository: WalletRepositoryPort,
    private readonly gateway: GatewayHttpService,
    private readonly accounts: GatewayAccountService,
  ) {}

  async balance(userId: string, correlationId: string): Promise<WalletResponseDto> {
    const token = await this.accounts.accessTokenForUser(userId)
    return this.gateway.getWallet(token, correlationId)
  }

  async transactions(userId: string, query: TransactionsQueryDto, correlationId: string): Promise<StatementResponseDto> {
    const token = await this.accounts.accessTokenForUser(userId)
    const localQuery = {
      limit: query.limit,
      status: query.status,
      method: query.type === 'PIX' ? 'PIX' as const : query.type === 'CREDIT_CARD' ? 'CARD' as const : undefined,
    }
    const [gatewayTransactions, orders, links] = await Promise.all([
      this.gateway.getTransactions(query, token, correlationId),
      query.type === 'WITHDRAWAL' ? Promise.resolve([]) : this.repository.findOrders(userId, localQuery),
      query.type === 'WITHDRAWAL' || (query.status && query.status !== 'EXPIRED' && query.status !== 'CANCELLED')
        ? Promise.resolve([]) : this.repository.findClosedLinks(userId, localQuery),
    ])
    const gatewayIds = new Set(gatewayTransactions.map((entry) => entry.id))
    const gatewayReferences = new Set(gatewayTransactions.map((entry) => entry.externalReference).filter(Boolean))
    const gatewayEntries = gatewayTransactions.map(toGatewayEntry)
    const orderEntries = orders.filter((order) => !gatewayIds.has(order.gatewayPaymentId ?? '')
      && !gatewayReferences.has(order.externalReference)).map(toOrderEntry)
    const linkEntries = links.map(toLinkEntry)
    const items = [...gatewayEntries, ...orderEntries, ...linkEntries]
      .filter((entry) => (!query.status || entry.status === query.status) && (!query.type || entry.type === query.type))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, query.limit)
    return { items }
  }
}

function toGatewayEntry(entry: GatewayTransaction): StatementEntryDto {
  return { ...entry, source: 'gateway' }
}

function toOrderEntry(order: Order): StatementEntryDto {
  return {
    id: order.id,
    type: order.checkoutLink.method === 'PIX' ? 'PIX' : 'CREDIT_CARD',
    status: order.status,
    amountCents: order.amountCents,
    description: order.checkoutLink.description,
    externalReference: order.externalReference,
    occurredAt: order.updatedAt.toISOString(),
    source: 'checkout',
  }
}

function toLinkEntry(link: CheckoutLink): StatementEntryDto {
  return {
    id: link.id,
    type: link.method === 'PIX' ? 'PIX' : 'CREDIT_CARD',
    status: link.status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED',
    amountCents: link.amountCents,
    description: link.description,
    externalReference: link.externalReference,
    occurredAt: link.status === 'ACTIVE' && link.expiresAt ? link.expiresAt.toISOString() : link.updatedAt.toISOString(),
    source: 'checkout',
  }
}
