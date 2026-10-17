import { apiRequest } from './client'

export interface Withdrawal {
  id: string
  amountCents: number
  status: string
  externalReference: string
  createdAt: string
}

export interface CreateWithdrawalInput {
  requestId: string
  amountCents: number
  pixKey: string
  document: string
  description?: string
}

export function createWithdrawal(token: string, input: CreateWithdrawalInput): Promise<Withdrawal> {
  return apiRequest('/withdrawals', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function listWithdrawals(token: string, signal?: AbortSignal): Promise<Withdrawal[]> {
  return apiRequest('/withdrawals', { signal }, token)
}

export function getWithdrawal(token: string, id: string): Promise<Withdrawal> {
  return apiRequest(`/withdrawals/${encodeURIComponent(id)}`, {}, token)
}
