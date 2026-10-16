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
    const customerCode = readString(response, 'CodigoCliente', 'codigoCliente', 'customerCode')
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

  async getPayment(id: string, token: string, correlationId: string): Promise<GatewayPayment> {
    return parsePayment(await this.request('GET', `/payments/${encodeURIComponent(id)}`, correlationId, undefined, token))
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
