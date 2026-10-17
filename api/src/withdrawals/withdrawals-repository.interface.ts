import { Withdrawal } from '../database/entities/withdrawal.entity.js'

export const WITHDRAWALS_REPOSITORY = Symbol('WITHDRAWALS_REPOSITORY')

export interface WithdrawalsRepositoryPort {
  createPending(withdrawal: Withdrawal): Promise<{ withdrawal: Withdrawal; created: boolean }>
  findOwned(id: string, userId: string): Promise<Withdrawal | null>
  listOwned(userId: string, limit: number): Promise<Withdrawal[]>
  save(withdrawal: Withdrawal): Promise<Withdrawal>
  removeUnsent(id: string): Promise<void>
}
