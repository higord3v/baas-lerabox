import { apiRequest } from './client'

export interface MerchantProfile {
  id: string
  email: string
  displayName: string
}

export interface RegisterMerchantInput {
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
  localPassword: string
}

export interface LocalCredentials {
  email: string
  password: string
}

export interface GatewayCredentials {
  document: string
  password: string
}

interface SessionResponse {
  accessToken: string
}

interface GatewayStatus {
  connected: boolean
}

export async function registerMerchant(input: RegisterMerchantInput): Promise<string> {
  const response = await apiRequest<{ message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.message
}

export async function loginMerchant(input: LocalCredentials): Promise<string> {
  const response = await apiRequest<SessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.accessToken
}

export function getMerchantProfile(token: string, signal?: AbortSignal): Promise<MerchantProfile> {
  return apiRequest<MerchantProfile>('/auth/me', { signal }, token)
}

export async function getGatewayStatus(token: string, signal?: AbortSignal): Promise<boolean> {
  const response = await apiRequest<GatewayStatus>('/gateway-account', { signal }, token)
  return response.connected
}

export async function connectGateway(token: string, input: GatewayCredentials): Promise<void> {
  await apiRequest<GatewayStatus>('/gateway-account/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token)
}
