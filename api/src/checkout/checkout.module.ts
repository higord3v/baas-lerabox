import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountModule } from '../gateway-account/gateway-account.module.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { CHECKOUT_REPOSITORY } from './checkout-repository.interface.js'
import { CheckoutRepository } from './checkout.repository.js'
import { CheckoutController } from './checkout.controller.js'
import { CheckoutService } from './checkout.service.js'
import { PublicCheckoutController } from './public-checkout.controller.js'

@Module({
  imports: [TypeOrmModule.forFeature([CheckoutLink, Order]), GatewayAccountModule, GatewayModule],
  controllers: [CheckoutController, PublicCheckoutController],
  providers: [
    CheckoutService,
    CheckoutRepository,
    { provide: CHECKOUT_REPOSITORY, useExisting: CheckoutRepository },
  ],
})
export class CheckoutModule {}
