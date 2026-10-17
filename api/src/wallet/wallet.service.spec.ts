import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { WalletRepositoryPort } from './wallet-repository.interface.js'
import { WalletService } from './wallet.service.js'

describe('WalletService', () => {
  it('uses the merchant token and consolidates gateway, orders, and expired links', async () => {
    const accounts = { accessTokenForUser: vi.fn().mockResolvedValue('gateway-token') }
    const gateway = { getWallet: vi.fn().mockResolvedValue({ balanceCents: 4200 }), getTransactions: vi.fn().mockResolvedValue([{
      id: 'gateway-payment', type: 'PIX', status: 'APPROVED', amountCents: 15000,
      description: 'Venda', externalReference: 'ORD-1', occurredAt: '2026-10-16T14:00:00.000Z',
    }]) }
    const link = { id: 'link-1', method: 'CARD', status: 'ACTIVE', amountCents: 2500,
      externalReference: 'LINK-1', description: 'Link vencido', expiresAt: new Date('2026-10-16T15:00:00Z'),
      updatedAt: new Date('2026-10-16T13:00:00Z') } as CheckoutLink
    const orders = [
      { id: 'order-1', gatewayPaymentId: 'gateway-payment', externalReference: 'ORD-1', status: 'APPROVED',
        amountCents: 15000, checkoutLink: { method: 'PIX', description: 'Venda' }, updatedAt: new Date('2026-10-16T14:00:00Z') },
      { id: 'order-2', gatewayPaymentId: null, externalReference: 'ORD-2', status: 'DENIED',
        amountCents: 3500, checkoutLink: { method: 'CARD', description: 'Recusado' }, updatedAt: new Date('2026-10-16T16:00:00Z') },
    ] as Order[]
    const repository = { findOrders: vi.fn().mockResolvedValue(orders), findClosedLinks: vi.fn().mockResolvedValue([link]) }
    const service = new WalletService(repository as unknown as WalletRepositoryPort,
      gateway as unknown as GatewayHttpService, accounts as unknown as GatewayAccountService)

    await expect(service.balance('merchant-1', 'correlation')).resolves.toEqual({ balanceCents: 4200 })
    const statement = await service.transactions('merchant-1', { limit: 50 }, 'correlation')
    expect(statement.items.map((item) => item.status)).toEqual(['DENIED', 'EXPIRED', 'APPROVED'])
    expect(statement.items.filter((item) => item.externalReference === 'ORD-1')).toHaveLength(1)
    expect(accounts.accessTokenForUser).toHaveBeenCalledWith('merchant-1')
    expect(gateway.getTransactions).toHaveBeenCalledWith({ limit: 50 }, 'gateway-token', 'correlation')
  })
})
