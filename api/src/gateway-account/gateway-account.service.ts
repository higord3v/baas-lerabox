import { ConflictException, Inject, Injectable } from '@nestjs/common'
import { GatewayAccount } from '../database/entities/gateway-account.entity.js'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { ConnectGatewayAccountDto } from './dto/connect-gateway-account.dto.js'
import { GatewayAccountStatusDto } from './dto/gateway-account-status.dto.js'
import { GATEWAY_ACCOUNT_REPOSITORY, type GatewayAccountRepositoryPort } from './gateway-account-repository.interface.js'
import { TokenCipherService } from './token-cipher.service.js'

@Injectable()
export class GatewayAccountService {
  constructor(
    @Inject(GATEWAY_ACCOUNT_REPOSITORY) private readonly accounts: GatewayAccountRepositoryPort,
    private readonly gateway: GatewayHttpService,
    private readonly cipher: TokenCipherService,
  ) {}

  async connect(userId: string, input: ConnectGatewayAccountDto, correlationId: string): Promise<GatewayAccountStatusDto> {
    const login = await this.gateway.login(input, correlationId)
    const account = await this.accounts.findByUserId(userId) ?? new GatewayAccount()
    if (account.customerCode && account.customerCode !== login.customerCode) {
      throw new ConflictException('Uma conta diferente já está vinculada a este lojista')
    }
    const linkedAccount = await this.accounts.findByCustomerCode(login.customerCode)
    if (linkedAccount && linkedAccount.userId !== userId) {
      throw new ConflictException('Esta conta do gateway já está vinculada a outro lojista')
    }
    account.userId = userId
    account.customerCode = login.customerCode
    account.encryptedStoreKey = this.cipher.encrypt(login.storeKey)
    account.encryptedAccessToken = this.cipher.encrypt(login.accessToken)
    account.tokenExpiresAt = null
    await this.accounts.save(account)
    return { connected: true }
  }

  async status(userId: string): Promise<GatewayAccountStatusDto> {
    return { connected: Boolean(await this.accounts.findByUserId(userId)) }
  }

  async accessTokenForUser(userId: string): Promise<string> {
    const account = await this.accounts.findWithAccessTokenByUserId(userId)
    if (!account?.encryptedAccessToken || (account.tokenExpiresAt && account.tokenExpiresAt <= new Date())) {
      throw new ConflictException('Conecte novamente sua conta do gateway')
    }
    return this.cipher.decrypt(account.encryptedAccessToken)
  }
}
