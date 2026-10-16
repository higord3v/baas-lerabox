import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GatewayAccount } from '../database/entities/gateway-account.entity.js'
import { GatewayAccountRepositoryPort } from './gateway-account-repository.interface.js'

@Injectable()
export class GatewayAccountRepository implements GatewayAccountRepositoryPort {
  constructor(@InjectRepository(GatewayAccount) private readonly accounts: Repository<GatewayAccount>) {}

  findByUserId(userId: string): Promise<GatewayAccount | null> {
    return this.accounts.findOne({ where: { userId } })
  }

  findWithAccessTokenByUserId(userId: string): Promise<GatewayAccount | null> {
    return this.accounts.createQueryBuilder('account')
      .addSelect('account.encryptedAccessToken')
      .where('account.userId = :userId', { userId })
      .getOne()
  }

  findByCustomerCode(customerCode: string): Promise<GatewayAccount | null> {
    return this.accounts.findOne({ where: { customerCode } })
  }

  save(account: GatewayAccount): Promise<GatewayAccount> {
    return this.accounts.save(account)
  }
}
