import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountModule } from '../gateway-account/gateway-account.module.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { WALLET_REPOSITORY } from './wallet-repository.interface.js'
import { WalletRepository } from './wallet.repository.js'
import { WalletController } from './wallet.controller.js'
import { WalletService } from './wallet.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Order, CheckoutLink]), GatewayAccountModule, GatewayModule],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, { provide: WALLET_REPOSITORY, useExisting: WalletRepository }],
})
export class WalletModule {}
