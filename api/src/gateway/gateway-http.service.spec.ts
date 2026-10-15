import { HttpService } from '@nestjs/axios'
import { BadGatewayException, UnauthorizedException } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { GatewayHttpService } from './gateway-http.service.js'

describe('GatewayHttpService', () => {
  it('reads the login response without exposing gateway credentials', async () => {
    const post = vi.fn().mockReturnValue(of({
      status: 201,
      data: { accessToken: 'gateway-token', CodigoCliente: 'C-1', ChaveLoja: 'L-1' },
    }))
    const service = new GatewayHttpService({ post } as unknown as HttpService)

    await expect(service.login({ document: '12345678901', password: 'secret' }, 'correlation'))
      .resolves.toEqual({ accessToken: 'gateway-token', customerCode: 'C-1', storeKey: 'L-1' })
    expect(post).toHaveBeenCalledWith(
      'https://api.branchpay.com.br/api/auth/login',
      { document: '12345678901', password: 'secret' },
      expect.objectContaining({ headers: { 'X-Correlation-Id': 'correlation' } }),
    )
  })

  it('maps invalid gateway credentials and malformed success responses', async () => {
    const post = vi.fn().mockReturnValueOnce(throwError(() => ({
      isAxiosError: true, response: { status: 401 },
    }))).mockReturnValueOnce(of({ status: 201, data: { message: 'ok' } }))
    const service = new GatewayHttpService({ post } as unknown as HttpService)

    await expect(service.login({ document: '12345678901', password: 'bad' }, 'correlation'))
      .rejects.toBeInstanceOf(UnauthorizedException)
    await expect(service.login({ document: '12345678901', password: 'secret' }, 'correlation'))
      .rejects.toBeInstanceOf(BadGatewayException)
  })
})
