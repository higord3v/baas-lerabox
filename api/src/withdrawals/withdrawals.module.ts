import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { GatewayAccountModule } from '../gateway-account/gateway-account.module.js'
import { TokenCipherService } from '../gateway-account/token-cipher.service.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { WITHDRAWALS_REPOSITORY } from './withdrawals-repository.interface.js'
import { WithdrawalsRepository } from './withdrawals.repository.js'
import { WithdrawalsController } from './withdrawals.controller.js'
import { WithdrawalsService } from './withdrawals.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Withdrawal]), GatewayAccountModule, GatewayModule],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, WithdrawalsRepository, TokenCipherService,
    { provide: WITHDRAWALS_REPOSITORY, useExisting: WithdrawalsRepository }],
})
export class WithdrawalsModule {}
