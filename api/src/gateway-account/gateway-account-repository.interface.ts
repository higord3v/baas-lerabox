import { GatewayAccount } from '../database/entities/gateway-account.entity.js'

export const GATEWAY_ACCOUNT_REPOSITORY = Symbol('GATEWAY_ACCOUNT_REPOSITORY')

export interface GatewayAccountRepositoryPort {
  findByUserId(userId: string): Promise<GatewayAccount | null>
  findByCustomerCode(customerCode: string): Promise<GatewayAccount | null>
  save(account: GatewayAccount): Promise<GatewayAccount>
}
