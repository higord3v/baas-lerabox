import { HttpService } from '@nestjs/axios'
import { BadGatewayException, UnauthorizedException } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { GatewayHttpService } from './gateway-http.service.js'

describe('GatewayHttpService', () => {
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
})
