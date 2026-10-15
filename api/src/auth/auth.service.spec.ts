import { JwtService } from '@nestjs/jwt'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { AuthService } from './auth.service.js'
import { RegisterMerchantDto } from './dto/register-merchant.dto.js'
import { PasswordService } from './password.service.js'
import { UserRepositoryPort } from './user-repository.interface.js'

describe('AuthService', () => {
  it('registers the gateway user without forwarding the local password', async () => {
    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'merchant-id' }),
    }
    const passwords = { hash: vi.fn().mockResolvedValue('hashed') }
    const gateway = { createUser: vi.fn().mockResolvedValue(undefined) }
    const service = new AuthService(
      users as unknown as UserRepositoryPort,
      passwords as unknown as PasswordService,
      {} as JwtService,
      gateway as unknown as GatewayHttpService,
    )
    const input: RegisterMerchantDto = {
      personType: 'PF', name: 'Maria Silva', email: 'MARIA@example.com',
      phone: '11999998888', document: '12345678901', zipCode: '01310100',
      address: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista',
      city: 'São Paulo', state: 'SP', localPassword: 'local-password-123',
    }

    await service.register(input, 'correlation')

    expect(gateway.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@example.com', document: '12345678901' }),
      'correlation',
    )
    expect(gateway.createUser.mock.calls[0][0]).not.toHaveProperty('localPassword')
    expect(users.create).toHaveBeenCalledWith({
      email: 'maria@example.com', displayName: 'Maria Silva', passwordHash: 'hashed',
    })
  })
})
