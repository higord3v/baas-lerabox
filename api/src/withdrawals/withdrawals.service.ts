import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { TokenCipherService } from '../gateway-account/token-cipher.service.js'
import { GatewayHttpService, type GatewayWithdrawal } from '../gateway/gateway-http.service.js'
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js'
import { WithdrawalResponseDto } from './dto/withdrawal-response.dto.js'
import { WITHDRAWALS_REPOSITORY, type WithdrawalsRepositoryPort } from './withdrawals-repository.interface.js'

@Injectable()
export class WithdrawalsService {
  constructor(
    @Inject(WITHDRAWALS_REPOSITORY) private readonly repository: WithdrawalsRepositoryPort,
    private readonly gateway: GatewayHttpService,
    private readonly accounts: GatewayAccountService,
    private readonly cipher: TokenCipherService,
  ) {}

  async create(userId: string, input: CreateWithdrawalDto, correlationId: string): Promise<WithdrawalResponseDto> {
    const token = await this.accounts.accessTokenForUser(userId)
    const pixKey = input.pixKey.trim()
    if (!pixKey) throw new BadRequestException('Informe uma chave Pix válida')
    const description = input.description?.trim() || null
    const destination = JSON.stringify({ pixKey, document: input.document, description })
    let withdrawal = new Withdrawal()
    withdrawal.id = randomUUID()
    withdrawal.userId = userId
    withdrawal.externalReference = `WD-${input.requestId}`
    withdrawal.gatewayWithdrawalId = null
    withdrawal.amountCents = input.amountCents
    withdrawal.status = 'PENDING'
    withdrawal.destinationType = 'PIX'
    withdrawal.encryptedDestination = this.cipher.encrypt(destination)
    const attempt = await this.repository.createPending(withdrawal)
    if (!attempt.created) {
      if (attempt.withdrawal.amountCents !== input.amountCents
        || this.cipher.decrypt(attempt.withdrawal.encryptedDestination) !== destination) {
        throw new ConflictException('Identificador já usado para outro saque')
      }
      return toResponse(attempt.withdrawal)
    }
    withdrawal = attempt.withdrawal

    let gatewayWithdrawal: GatewayWithdrawal
    try {
      gatewayWithdrawal = await this.gateway.createWithdrawal({
        amount: input.amountCents,
        pixKey,
        document: input.document,
        description: description ?? undefined,
        externalReference: withdrawal.externalReference,
      }, token, correlationId)
    } catch (error) {
      if (error instanceof BadRequestException) await this.repository.removeUnsent(withdrawal.id)
      throw error
    }
    validateGatewayWithdrawal(gatewayWithdrawal, withdrawal)
    withdrawal.gatewayWithdrawalId = gatewayWithdrawal.id
    await this.repository.save(withdrawal)
    try {
      return await this.refresh(withdrawal, token, correlationId)
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException) return toResponse(withdrawal)
      throw error
    }
  }

  async detail(userId: string, id: string, correlationId: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.repository.findOwned(id, userId)
    if (!withdrawal) throw new NotFoundException('Saque não encontrado')
    if (!withdrawal.gatewayWithdrawalId) return toResponse(withdrawal)
    const token = await this.accounts.accessTokenForUser(userId)
    return this.refresh(withdrawal, token, correlationId)
  }

  async list(userId: string): Promise<WithdrawalResponseDto[]> {
    return (await this.repository.listOwned(userId, 20)).map(toResponse)
  }

  private async refresh(withdrawal: Withdrawal, token: string, correlationId: string): Promise<WithdrawalResponseDto> {
    const gatewayWithdrawal = await this.gateway.getWithdrawal(withdrawal.gatewayWithdrawalId!, token, correlationId)
    validateGatewayWithdrawal(gatewayWithdrawal, withdrawal)
    if (gatewayWithdrawal.id !== withdrawal.gatewayWithdrawalId) throw new BadGatewayException('Consulta de saque divergente')
    withdrawal.status = gatewayWithdrawal.status
    return toResponse(await this.repository.save(withdrawal))
  }
}

function validateGatewayWithdrawal(result: GatewayWithdrawal, withdrawal: Withdrawal): void {
  if ((result.amount !== null && result.amount !== withdrawal.amountCents)
    || (result.externalReference !== null && result.externalReference !== withdrawal.externalReference)) {
    throw new BadGatewayException('Saque divergente do gateway')
  }
}

function toResponse(withdrawal: Withdrawal): WithdrawalResponseDto {
  return {
    id: withdrawal.id,
    amountCents: withdrawal.amountCents,
    status: withdrawal.status,
    externalReference: withdrawal.externalReference,
    createdAt: withdrawal.createdAt,
  }
}
