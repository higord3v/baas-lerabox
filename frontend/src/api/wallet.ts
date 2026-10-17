import { apiRequest } from './client'

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED'
export type TransactionType = 'PIX' | 'CREDIT_CARD' | 'WITHDRAWAL'

export interface WalletBalance {
  balanceCents: number
}

export interface StatementEntry {
  id: string
  type: TransactionType
  status: TransactionStatus
  amountCents: number
  description: string | null
  externalReference: string | null
  occurredAt: string
  source: 'gateway' | 'checkout'
}

export interface StatementQuery {
  status?: TransactionStatus
  type?: TransactionType
  limit?: number
}

export function getWallet(token: string, signal?: AbortSignal): Promise<WalletBalance> {
  return apiRequest('/wallet', { signal }, token)
}

export async function getStatement(token: string, query: StatementQuery = {}, signal?: AbortSignal): Promise<StatementEntry[]> {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.type) params.set('type', query.type)
  if (query.limit) params.set('limit', String(query.limit))
  const search = params.toString()
  const response = await apiRequest<{ items: StatementEntry[] }>(`/wallet/transactions${search ? `?${search}` : ''}`, { signal }, token)
  return response.items
}
