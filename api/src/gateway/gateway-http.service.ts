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

@Injectable()
export class GatewayHttpService {
  private readonly logger = new Logger(GatewayHttpService.name)
  private readonly baseUrl = process.env.GATEWAY_BASE_URL ?? 'https://api.branchpay.com.br/api'

  constructor(private readonly http: HttpService) {}

  async createUser(input: GatewayCreateUserInput, correlationId: string): Promise<void> {
    await this.post('/users', input, correlationId)
  }

  async login(input: GatewayLoginInput, correlationId: string): Promise<GatewayLoginResult> {
    const response = await this.post('/auth/login', input, correlationId)
    if (!isRecord(response)) throw new BadGatewayException('Resposta inválida do gateway')

    const accessToken = readString(response, 'accessToken', 'access_token', 'token')
    const customerCode = readString(response, 'CodigoCliente', 'codigoCliente', 'customerCode')
    const storeKey = readString(response, 'ChaveLoja', 'chaveLoja', 'storeKey')
    if (!accessToken || !customerCode || !storeKey) {
      throw new BadGatewayException('Resposta inválida do gateway')
    }
    return { accessToken, customerCode, storeKey }
  }

  private async post(path: string, body: object, correlationId: string): Promise<unknown> {
    const start = Date.now()
    let status = 0
    try {
      const response = await firstValueFrom(this.http.post<unknown>(`${this.baseUrl}${path}`, body, {
        headers: { 'X-Correlation-Id': correlationId },
        timeout: 10000,
      }))
      status = response.status
      return response.data
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        status = error.response?.status ?? 0
        if (status === 401) throw new UnauthorizedException('Credenciais do gateway inválidas')
        if (status === 409) throw new ConflictException('Cadastro já existente no gateway')
        if (status >= 400 && status < 500) throw new BadRequestException('Dados recusados pelo gateway')
      }
      throw new ServiceUnavailableException('Gateway indisponível')
    } finally {
      this.logger.log(`${correlationId} POST ${path} status=${status} durationMs=${Date.now() - start}`)
    }
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
