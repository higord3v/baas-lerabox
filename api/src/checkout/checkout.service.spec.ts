import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { CheckoutRepositoryPort } from './checkout-repository.interface.js'
import { CheckoutService } from './checkout.service.js'

describe('CheckoutService', () => {
  it('confirms a Pix payment when the gateway query omits fields already checked at creation', async () => {
    const link = Object.assign(new CheckoutLink(), {
      id: 'link-id', userId: 'merchant-id', amountCents: 15000,
      method: 'PIX', status: 'ACTIVE', expiresAt: null, description: null,
    })
    const order = Object.assign(new Order(), {
      id: 'order-id', userId: 'merchant-id', checkoutLinkId: link.id,
      externalReference: 'ORD-order-id', amountCents: link.amountCents,
      status: 'PENDING', gatewayPaymentId: null, pixEmv: null,
      pixQrCodeBase64: null, pixTxid: null,
    })
    const repository = {
      findAttempt: vi.fn().mockResolvedValue(null),
      findLink: vi.fn().mockResolvedValue(link),
      createAttempt: vi.fn().mockResolvedValue({ order, created: true }),
      saveOrder: vi.fn().mockResolvedValue(order),
      findOrder: vi.fn().mockImplementation(async () => order),
      confirmPayment: vi.fn().mockImplementation(async (_id: string, status: Order['status']) => {
        order.status = status
      }),
    }
    const gateway = {
      createPix: vi.fn().mockResolvedValue({
        id: 'payment-id', amount: 15000, externalReference: order.externalReference,
        status: 'APPROVED', emv: 'pix-code', qrCodeBase64: null, txid: 'TX1',
      }),
      getPayment: vi.fn().mockResolvedValue({
        id: 'payment-id', status: 'APPROVED', amount: null, externalReference: null,
      }),
    }
    const accounts = { accessTokenForUser: vi.fn().mockResolvedValue('gateway-token') }
    const service = new CheckoutService(
      repository as unknown as CheckoutRepositoryPort,
      gateway as unknown as GatewayHttpService,
      accounts as unknown as GatewayAccountService,
    )

    const result = await service.payPix(link.id, {
      payerDocument: '12345678901', attemptKey: '00000000-0000-4000-8000-000000000001',
    }, 'correlation')

    expect(result).toMatchObject({ orderId: order.id, status: 'APPROVED', emv: 'pix-code' })
    expect(repository.confirmPayment).toHaveBeenCalledWith(order.id, 'APPROVED')
  })
})
