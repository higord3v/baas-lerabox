import { HttpService } from '@nestjs/axios'
import { BadGatewayException, UnauthorizedException } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { GatewayHttpService } from './gateway-http.service.js'

describe('GatewayHttpService', () => {
  it('registers a signed webhook with the merchant token', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({ status: 201, data: {} }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)
    const input = { event: 'PAYMENT_PIX' as const, url: 'https://baas.example.com/webhooks/lera-box/id', secret: 'private-secret' }
    await service.registerWebhook(input, 'merchant-token', 'correlation')
    expect(httpRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', url: 'https://api.branchpay.com.br/api/webhooks', data: input,
      headers: { 'X-Correlation-Id': 'correlation', Authorization: 'Bearer merchant-token' },
    }))
  })
  it('reads the login response without exposing gateway credentials', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({
      status: 201,
      data: { accessToken: 'gateway-token', CodigoCliente: 'C-1', ChaveLoja: 'L-1' },
    }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.login({ document: '12345678901', password: 'secret' }, 'correlation'))
      .resolves.toEqual({ accessToken: 'gateway-token', customerCode: 'C-1', storeKey: 'L-1' })
    expect(httpRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', url: 'https://api.branchpay.com.br/api/auth/login',
      data: { document: '12345678901', password: 'secret' },
      headers: { 'X-Correlation-Id': 'correlation' },
    }))
  })

  it('maps the login response returned by the gateway', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({
      status: 201,
      data: {
        access_token: 'gateway-token',
        token_type: 'Bearer',
        codigoCliente: 123456,
        chaveLoja: 'store-key',
        user: { id: 'gateway-user', document: '12345678901' },
      },
    }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.login({ document: '12345678901', password: 'secret' }, 'correlation'))
      .resolves.toEqual({ accessToken: 'gateway-token', customerCode: '123456', storeKey: 'store-key' })
  })

  it('maps invalid gateway credentials and malformed success responses', async () => {
    const httpRequest = vi.fn().mockReturnValueOnce(throwError(() => ({
      isAxiosError: true, response: { status: 401 },
    }))).mockReturnValueOnce(of({ status: 201, data: { message: 'ok' } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.login({ document: '12345678901', password: 'bad' }, 'correlation'))
      .rejects.toBeInstanceOf(UnauthorizedException)
    await expect(service.login({ document: '12345678901', password: 'secret' }, 'correlation'))
      .rejects.toBeInstanceOf(BadGatewayException)
  })

  it('maps Pix payment fields while ignoring gateway account details', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({ status: 201, data: {
      id: 'payment-id', amount: 15000, status: 'APPROVED', externalReference: 'ORD-123',
      CodigoCliente: 123, ChaveLoja: 'never-return-this', walletBalance: 999,
      metadata: { emv: 'pix-code', qrCodeBase64: 'data:image/png;base64,AAAA', txid: 'TX1' },
    } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.createPix({ amount: 15000, payerDocument: '12345678901', externalReference: 'ORD-123' }, 'token', 'correlation'))
      .resolves.toEqual({ id: 'payment-id', amount: 15000, status: 'APPROVED', externalReference: 'ORD-123', emv: 'pix-code', qrCodeBase64: 'data:image/png;base64,AAAA', txid: 'TX1' })
    expect(httpRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: { 'X-Correlation-Id': 'correlation', Authorization: 'Bearer token' },
    }))
  })

  it('reads a status-only payment query after a validated charge', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({
      status: 200,
      data: { status: 'APPROVED' },
    }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.getPayment('payment-id', 'token', 'correlation'))
      .resolves.toEqual({ id: 'payment-id', status: 'APPROVED', amount: null, externalReference: null })
  })

  it('maps wallet balance and filtered transactions without exposing account data', async () => {
    const httpRequest = vi.fn()
      .mockReturnValueOnce(of({ status: 200, data: { balance: 64904, CodigoCliente: 123, ChaveLoja: 'hidden' } }))
      .mockReturnValueOnce(of({ status: 200, data: { transactions: [{
        id: 'payment-id', type: 'PIX', status: 'APPROVED', amount: 15000,
        description: 'Pedido', externalReference: 'ORD-123', createdAt: '2026-10-16T18:52:43.052Z',
      }] } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.getWallet('secret-token', 'correlation')).resolves.toEqual({ balanceCents: 64904 })
    await expect(service.getTransactions({ status: 'APPROVED', type: 'PIX', limit: 10 }, 'secret-token', 'correlation'))
      .resolves.toEqual([{
        id: 'payment-id', type: 'PIX', status: 'APPROVED', amountCents: 15000,
        description: 'Pedido', externalReference: 'ORD-123', occurredAt: '2026-10-16T18:52:43.052Z',
      }])
    expect(httpRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: 'https://api.branchpay.com.br/api/wallet',
      headers: { 'X-Correlation-Id': 'correlation', Authorization: 'Bearer secret-token' },
    }))
    expect(httpRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: 'https://api.branchpay.com.br/api/wallet/transactions?limit=10&status=APPROVED&type=PIX',
    }))
  })

  it('rejects malformed wallet and statement responses', async () => {
    const httpRequest = vi.fn()
      .mockReturnValueOnce(of({ status: 200, data: { balance: 'R$ 10,00' } }))
      .mockReturnValueOnce(of({ status: 200, data: { transactions: [{ id: 'bad' }] } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.getWallet('token', 'correlation')).rejects.toBeInstanceOf(BadGatewayException)
    await expect(service.getTransactions({ limit: 50 }, 'token', 'correlation')).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('accepts nested wallet data and normalizes a withdrawal debit in cents', async () => {
    const httpRequest = vi.fn()
      .mockReturnValueOnce(of({ status: 200, data: { wallet: { balanceCents: 8000 } } }))
      .mockReturnValueOnce(of({ status: 200, data: { data: { items: [{
        id: 'withdrawal-1', type: 'WITHDRAWAL', status: 'APPROVED', amount: -2000,
        metadata: { externalReference: 'WD-1' }, createdAt: '2026-10-16T18:52:43.052Z',
      }] } } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)

    await expect(service.getWallet('token', 'correlation')).resolves.toEqual({ balanceCents: 8000 })
    await expect(service.getTransactions({ limit: 5 }, 'token', 'correlation')).resolves.toEqual([expect.objectContaining({
      id: 'withdrawal-1', amountCents: 2000, externalReference: 'WD-1', description: null,
    })])
  })

  it('sends a withdrawal with the merchant token and reads its status without returning the Pix key', async () => {
    const httpRequest = vi.fn()
      .mockReturnValueOnce(of({ status: 201, data: {
        id: 'withdrawal-1', status: 'PENDING', amount: 10000, externalReference: 'WD-1',
        pixKey: 'private@example.com', walletBalance: 5000,
      } }))
      .mockReturnValueOnce(of({ status: 200, data: { status: 'APPROVED' } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)
    const input = { amount: 10000, pixKey: 'private@example.com', document: '12345678901', externalReference: 'WD-1' }

    await expect(service.createWithdrawal(input, 'merchant-token', 'correlation'))
      .resolves.toEqual({ id: 'withdrawal-1', status: 'PENDING', amount: 10000, externalReference: 'WD-1' })
    await expect(service.getWithdrawal('withdrawal-1', 'merchant-token', 'correlation'))
      .resolves.toEqual({ id: 'withdrawal-1', status: 'APPROVED', amount: null, externalReference: null })
    expect(httpRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: 'POST', url: 'https://api.branchpay.com.br/api/withdrawals', data: input,
      headers: { 'X-Correlation-Id': 'correlation', Authorization: 'Bearer merchant-token' },
    }))
  })

  it('rejects a malformed withdrawal response', async () => {
    const httpRequest = vi.fn().mockReturnValue(of({ status: 201, data: { status: 'PENDING' } }))
    const service = new GatewayHttpService({ request: httpRequest } as unknown as HttpService)
    await expect(service.createWithdrawal({ amount: 100, pixKey: 'key', document: '12345678901', externalReference: 'WD-1' },
      'token', 'correlation')).rejects.toBeInstanceOf(BadGatewayException)
  })
})
