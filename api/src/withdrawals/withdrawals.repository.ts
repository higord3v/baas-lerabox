import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, QueryFailedError, Repository } from 'typeorm'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { WithdrawalsRepositoryPort } from './withdrawals-repository.interface.js'

@Injectable()
export class WithdrawalsRepository implements WithdrawalsRepositoryPort {
  constructor(@InjectRepository(Withdrawal) private readonly withdrawals: Repository<Withdrawal>) {}

  async createPending(withdrawal: Withdrawal): Promise<{ withdrawal: Withdrawal; created: boolean }> {
    try {
      await this.withdrawals.insert(withdrawal)
      const created = await this.withdrawals.findOneByOrFail({ id: withdrawal.id })
      return { withdrawal: created, created: true }
    } catch (error) {
      if (!(error instanceof QueryFailedError) || !isDuplicateEntry(error)) throw error
      const existing = await this.withdrawals.createQueryBuilder('withdrawal')
        .addSelect('withdrawal.encryptedDestination')
        .where('withdrawal.userId = :userId', { userId: withdrawal.userId })
        .andWhere('withdrawal.externalReference = :reference', { reference: withdrawal.externalReference })
        .getOne()
      if (!existing) throw error
      return { withdrawal: existing, created: false }
    }
  }

  findOwned(id: string, userId: string): Promise<Withdrawal | null> {
    return this.withdrawals.findOne({ where: { id, userId } })
  }

  listOwned(userId: string, limit: number): Promise<Withdrawal[]> {
    return this.withdrawals.find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit })
  }

  save(withdrawal: Withdrawal): Promise<Withdrawal> {
    return this.withdrawals.save(withdrawal)
  }

  async removeUnsent(id: string): Promise<void> {
    await this.withdrawals.delete({ id, gatewayWithdrawalId: IsNull() })
  }
}

function isDuplicateEntry(error: QueryFailedError): boolean {
  const cause: unknown = error.driverError
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ER_DUP_ENTRY'
}
