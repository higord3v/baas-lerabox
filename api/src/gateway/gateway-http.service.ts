import { HttpService } from '@nestjs/axios'
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import axios from 'axios'
import { firstValueFrom } from 'rxjs'

export interface GatewayCreateUserInput {
  personType: 'PF' | 'PJ'
  name: string
  tradingName?: string
  email: string
  phone: string
  document: string
  zipCode: string
  address: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

export interface GatewayLoginInput {
  document: string
  password: string
}

export interface GatewayLoginResult {
  accessToken: string
  customerCode: string
  storeKey: string
}

export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO'

export interface GatewayFee {
  brand: CardBrand
  installments: number
  feePercent: number
}

export interface GatewayPixInput {
  amount: number
  description?: string
  payerDocument: string
  externalReference: string
}

export interface GatewayCardInput {
  amount: number
  description?: string
  externalReference: string
  cardNumber: string
  cardHolder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  installments: number
  feePercent: number
}

export interface GatewayPayment {
  id: string
  amount: number
  externalReference: string
  status: string
  emv: string | null
  qrCodeBase64: string | null
  txid: string | null
}

export interface GatewayPaymentStatus {
  id: string
  status: string
  amount: number | null
  externalReference: string | null
}

export type GatewayTransactionStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED'
export type GatewayTransactionType = 'PIX' | 'CREDIT_CARD' | 'WITHDRAWAL'

export interface GatewayWallet {
  balanceCents: number
}

export interface GatewayTransaction {
  id: string
  type: GatewayTransactionType
  status: GatewayTransactionStatus
  amountCents: number
  description: string | null
  externalReference: string | null
  occurredAt: string
}

export interface GatewayTransactionQuery {
  status?: GatewayTransactionStatus
  type?: GatewayTransactionType
  limit: number
}

export interface GatewayWithdrawalInput {
  amount: number
  pixKey: string
  document: string
  description?: string
  externalReference: string
}

export interface GatewayWithdrawal {
  id: string
  status: string
  amount: number | null
  externalReference: string | null
}

@Injectable()
export class GatewayHttpService {
  private readonly logger = new Logger(GatewayHttpService.name)
  private readonly baseUrl = process.env.GATEWAY_BASE_URL ?? 'https://api.branchpay.com.br/api'

  constructor(private readonly http: HttpService) {}

  async createUser(input: GatewayCreateUserInput, correlationId: string): Promise<void> {
    await this.request('POST', '/users', correlationId, input)
  }

  async login(input: GatewayLoginInput, correlationId: string): Promise<GatewayLoginResult> {
    const response = await this.request('POST', '/auth/login', correlationId, input)
    if (!isRecord(response)) throw new BadGatewayException('Resposta inválida do gateway')

    const accessToken = readString(response, 'accessToken', 'access_token', 'token')
    const customerCode = readCustomerCode(response)
    const storeKey = readString(response, 'ChaveLoja', 'chaveLoja', 'storeKey')
    if (!accessToken || !customerCode || !storeKey) {
      throw new BadGatewayException('Resposta inválida do gateway')
    }
    return { accessToken, customerCode, storeKey }
  }

  async getFees(brand: CardBrand, correlationId: string): Promise<GatewayFee[]> {
    const response = await this.request('GET', `/fees?brand=${brand}`, correlationId)
    if (!isRecord(response) || !Array.isArray(response.fees)) {
      throw new BadGatewayException('Tabela de taxas inválida')
    }
    return response.fees.map((entry: unknown) => {
      if (!isRecord(entry) || entry.brand !== brand || !Number.isInteger(entry.installments)
        || typeof entry.feePercent !== 'number' || !Number.isFinite(entry.feePercent)) {
        throw new BadGatewayException('Tabela de taxas inválida')
      }
      return { brand, installments: entry.installments as number, feePercent: entry.feePercent }
    })
  }

  async createPix(input: GatewayPixInput, token: string, correlationId: string): Promise<GatewayPayment> {
    const response = await this.request('POST', '/payments/pix', correlationId, input, token)
    const payment = parsePayment(response)
    if (!payment.emv && !payment.qrCodeBase64 && payment.status !== 'DENIED') {
      throw new BadGatewayException('Resposta Pix inválida do gateway')
    }
    return payment
  }

  async createCardPayment(input: GatewayCardInput, token: string, correlationId: string): Promise<GatewayPayment> {
    return parsePayment(await this.request('POST', '/payments/card', correlationId, input, token))
  }

  async getPayment(id: string, token: string, correlationId: string): Promise<GatewayPaymentStatus> {
    return parsePaymentStatus(await this.request('GET', `/payments/${encodeURIComponent(id)}`, correlationId, undefined, token), id)
  }

  async getWallet(token: string, correlationId: string): Promise<GatewayWallet> {
    const response = await this.request('GET', '/wallet', correlationId, undefined, token)
    if (!isRecord(response)) throw new BadGatewayException('Carteira inválida do gateway')
    const wallet = isRecord(response.wallet) ? response.wallet : response
    const balance = wallet.balanceCents ?? wallet.balance ?? wallet.walletBalance
    if (!Number.isSafeInteger(balance)) throw new BadGatewayException('Carteira inválida do gateway')
    return { balanceCents: balance as number }
  }

  async getTransactions(query: GatewayTransactionQuery, token: string, correlationId: string): Promise<GatewayTransaction[]> {
    const params = new URLSearchParams({ limit: String(query.limit) })
    if (query.status) params.set('status', query.status)
    if (query.type) params.set('type', query.type)
    const response = await this.request('GET', `/wallet/transactions?${params}`, correlationId, undefined, token)
    const body = isRecord(response) && isRecord(response.data) ? response.data : response
    const entries = Array.isArray(body) ? body
      : isRecord(body) ? body.transactions ?? body.items ?? body.data : null
    if (!Array.isArray(entries)) throw new BadGatewayException('Extrato inválido do gateway')
    return entries.map(parseTransaction)
  }

  async createWithdrawal(input: GatewayWithdrawalInput, token: string, correlationId: string): Promise<GatewayWithdrawal> {
    return parseWithdrawal(await this.request('POST', '/withdrawals', correlationId, input, token))
  }

  async getWithdrawal(id: string, token: string, correlationId: string): Promise<GatewayWithdrawal> {
    return parseWithdrawal(await this.request('GET', `/withdrawals/${encodeURIComponent(id)}`, correlationId, undefined, token), id)
  }

  private async request(method: 'GET' | 'POST', path: string, correlationId: string, body?: object, token?: string): Promise<unknown> {
    const start = Date.now()
    let status = 0
    try {
      const response = await firstValueFrom(this.http.request<unknown>({
        method,
        url: `${this.baseUrl}${path}`,
        data: body,
        headers: { 'X-Correlation-Id': correlationId, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        timeout: 10000,
      }))
      status = response.status
      return response.data
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        status = error.response?.status ?? 0
        if (status === 401) throw new UnauthorizedException('Credenciais do gateway inválidas')
        if (status === 409) throw new ConflictException('Operação recusada pelo gateway')
        if (status >= 400 && status < 500) throw new BadRequestException('Dados recusados pelo gateway')
      }
      throw new ServiceUnavailableException('Gateway indisponível')
    } finally {
      this.logger.log(`${correlationId} ${method} ${path} status=${status} durationMs=${Date.now() - start}`)
    }
  }
}

function parsePayment(value: unknown): GatewayPayment {
  if (!isRecord(value)) throw new BadGatewayException('Resposta inválida do gateway')
  const metadata = isRecord(value.metadata) ? value.metadata : {}
  const id = readString(value, 'id')
  const externalReference = readString(value, 'externalReference')
  const status = readString(value, 'status')
  if (!id || !externalReference || !status || !Number.isInteger(value.amount)) {
    throw new BadGatewayException('Resposta inválida do gateway')
  }
  return {
    id,
    externalReference,
    status,
    amount: value.amount as number,
    emv: readString(value, 'emv', 'copyPaste') ?? readString(metadata, 'emv'),
    qrCodeBase64: readString(value, 'qrCodeBase64') ?? readString(metadata, 'qrCodeBase64'),
    txid: readString(value, 'txid') ?? readString(metadata, 'txid'),
  }
}

function parsePaymentStatus(value: unknown, requestedId: string): GatewayPaymentStatus {
  if (!isRecord(value)) throw new BadGatewayException('Consulta de pagamento inválida')
  const responseId = value.id
  const status = readString(value, 'status')
  const metadata = isRecord(value.metadata) ? value.metadata : {}
  const externalReference = value.externalReference ?? metadata.externalReference
  const amount = value.amount
  if (!status || (responseId != null && (typeof responseId !== 'string' || responseId.length === 0))
    || (amount != null && (typeof amount !== 'number' || !Number.isInteger(amount)))
    || (externalReference != null && (typeof externalReference !== 'string' || externalReference.length === 0))) {
    throw new BadGatewayException('Consulta de pagamento inválida')
  }
  return { id: responseId ?? requestedId, status, amount: amount ?? null, externalReference: externalReference ?? null }
}

function parseTransaction(value: unknown): GatewayTransaction {
  if (!isRecord(value)) throw new BadGatewayException('Transação inválida do gateway')
  const id = readString(value, 'id')
  const type = readString(value, 'type')
  const status = readString(value, 'status')
  const amount = value.amountCents ?? value.amount
  const occurredAt = readString(value, 'createdAt', 'occurredAt', 'date', 'timestamp')
  const description = value.description
  const metadata = isRecord(value.metadata) ? value.metadata : {}
  const externalReference = value.externalReference ?? metadata.externalReference
  if (!id || !isTransactionType(type) || !isTransactionStatus(status)
    || !Number.isSafeInteger(amount)
    || !occurredAt || Number.isNaN(Date.parse(occurredAt))
    || (description != null && typeof description !== 'string')
    || (externalReference != null && typeof externalReference !== 'string')) {
    throw new BadGatewayException('Transação inválida do gateway')
  }
  return {
    id, type, status, amountCents: Math.abs(amount as number),
    description: description ?? null, externalReference: externalReference ?? null, occurredAt,
  }
}

function parseWithdrawal(value: unknown, requestedId?: string): GatewayWithdrawal {
  if (!isRecord(value)) throw new BadGatewayException('Resposta de saque inválida do gateway')
  const id = readString(value, 'id') ?? requestedId
  const status = readString(value, 'status')
  const metadata = isRecord(value.metadata) ? value.metadata : {}
  const externalReference = value.externalReference ?? metadata.externalReference
  const amount = value.amount
  if (!id || !status || (value.id != null && typeof value.id !== 'string')
    || (amount != null && (!Number.isSafeInteger(amount) || (amount as number) < 0))
    || (externalReference != null && (typeof externalReference !== 'string' || externalReference.length === 0))) {
    throw new BadGatewayException('Resposta de saque inválida do gateway')
  }
  return { id, status, amount: amount == null ? null : amount as number,
    externalReference: externalReference == null ? null : externalReference as string }
}

function isTransactionStatus(value: string | null): value is GatewayTransactionStatus {
  return value === 'PENDING' || value === 'APPROVED' || value === 'DENIED' || value === 'EXPIRED' || value === 'CANCELLED'
}

function isTransactionType(value: string | null): value is GatewayTransactionType {
  return value === 'PIX' || value === 'CREDIT_CARD' || value === 'WITHDRAWAL'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function readCustomerCode(record: Record<string, unknown>): string | null {
  for (const key of ['CodigoCliente', 'codigoCliente', 'customerCode']) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  }
  return null
}
