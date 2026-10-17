import { BadGatewayException, ConflictException } from '@nestjs/common'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { TokenCipherService } from '../gateway-account/token-cipher.service.js'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { WithdrawalsRepositoryPort } from './withdrawals-repository.interface.js'
import { WithdrawalsService } from './withdrawals.service.js'

const requestId = '77777777-7777-4777-8777-777777777777'
const input = { requestId, amountCents: 10000, pixKey: 'owner@example.com', document: '12345678901' }

function fixture() {
  const repository = {
    createPending: vi.fn().mockImplementation(async (withdrawal: Withdrawal) => ({
      withdrawal: Object.assign(withdrawal, { createdAt: new Date('2026-10-16T12:00:00Z') }), created: true,
    })),
    findOwned: vi.fn(), listOwned: vi.fn(), save: vi.fn().mockImplementation(async (withdrawal: Withdrawal) => withdrawal),
    removeUnsent: vi.fn(),
  }
  const gateway = {
    createWithdrawal: vi.fn().mockImplementation(async (request: { amount: number; externalReference: string }) => ({
      id: 'gateway-id', status: 'APPROVED', amount: request.amount, externalReference: request.externalReference,
    })),
    getWithdrawal: vi.fn().mockResolvedValue({ id: 'gateway-id', status: 'PENDING', amount: null, externalReference: null }),
  }
  const accounts = { accessTokenForUser: vi.fn().mockResolvedValue('gateway-token') }
  const cipher = { encrypt: vi.fn().mockImplementation((value: string) => `encrypted:${value}`),
    decrypt: vi.fn().mockImplementation((value: string) => value.replace(/^encrypted:/, '')) }
  const service = new WithdrawalsService(repository as unknown as WithdrawalsRepositoryPort,
    gateway as unknown as GatewayHttpService, accounts as unknown as GatewayAccountService,
    cipher as unknown as TokenCipherService)
  return { service, repository, gateway, accounts, cipher }
}

describe('WithdrawalsService', () => {
  it('creates a referenced withdrawal and changes status only after querying the gateway', async () => {
    const { service, repository, gateway, accounts, cipher } = fixture()
    const result = await service.create('merchant-1', input, 'correlation')

    expect(result).toMatchObject({ amountCents: 10000, status: 'PENDING', externalReference: `WD-${requestId}` })
    expect(accounts.accessTokenForUser).toHaveBeenCalledWith('merchant-1')
    expect(gateway.createWithdrawal).toHaveBeenCalledWith(expect.objectContaining({
      amount: 10000, pixKey: 'owner@example.com', document: '12345678901', externalReference: `WD-${requestId}`,
    }), 'gateway-token', 'correlation')
    expect(gateway.getWithdrawal).toHaveBeenCalledWith('gateway-id', 'gateway-token', 'correlation')
    expect(cipher.encrypt).toHaveBeenCalledWith(expect.stringContaining('owner@example.com'))
    expect(repository.save).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(result)).not.toContain('owner@example.com')
  })

  it('does not resend an idempotent request and rejects a changed destination', async () => {
    const { service, repository, gateway } = fixture()
    const existing = { id: 'local-id', userId: 'merchant-1', externalReference: `WD-${requestId}`,
      amountCents: 10000, status: 'PENDING', encryptedDestination: `encrypted:${JSON.stringify({
        pixKey: input.pixKey, document: input.document, description: null,
      })}`, createdAt: new Date('2026-10-16T12:00:00Z') } as Withdrawal
    repository.createPending.mockResolvedValue({ withdrawal: existing, created: false })

    await expect(service.create('merchant-1', input, 'correlation')).resolves.toMatchObject({ id: 'local-id' })
    await expect(service.create('merchant-1', { ...input, pixKey: 'other@example.com' }, 'correlation'))
      .rejects.toBeInstanceOf(ConflictException)
    expect(gateway.createWithdrawal).not.toHaveBeenCalled()
  })

  it('rejects a gateway withdrawal with divergent amount before linking it', async () => {
    const { service, repository, gateway } = fixture()
    gateway.createWithdrawal.mockResolvedValue({
      id: 'gateway-id', status: 'APPROVED', amount: 9999, externalReference: `WD-${requestId}`,
    })
    await expect(service.create('merchant-1', input, 'correlation')).rejects.toBeInstanceOf(BadGatewayException)
    expect(repository.save).not.toHaveBeenCalled()
  })
})
