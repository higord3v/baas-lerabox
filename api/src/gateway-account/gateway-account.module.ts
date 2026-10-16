import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GatewayAccount } from '../database/entities/gateway-account.entity.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { GatewayAccountController } from './gateway-account.controller.js'
import { GATEWAY_ACCOUNT_REPOSITORY } from './gateway-account-repository.interface.js'
import { GatewayAccountRepository } from './gateway-account.repository.js'
import { GatewayAccountService } from './gateway-account.service.js'
import { TokenCipherService } from './token-cipher.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([GatewayAccount]), GatewayModule],
  controllers: [GatewayAccountController],
  providers: [
    GatewayAccountService,
    GatewayAccountRepository,
    TokenCipherService,
    { provide: GATEWAY_ACCOUNT_REPOSITORY, useExisting: GatewayAccountRepository },
  ],
  exports: [GatewayAccountService],
})
export class GatewayAccountModule {}
