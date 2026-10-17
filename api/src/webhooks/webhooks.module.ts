import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { WebhookEvent } from '../database/entities/webhook-event.entity.js'
import { WebhookSubscription } from '../database/entities/webhook-subscription.entity.js'
import { Withdrawal } from '../database/entities/withdrawal.entity.js'
import { GatewayAccountModule } from '../gateway-account/gateway-account.module.js'
import { TokenCipherService } from '../gateway-account/token-cipher.service.js'
import { GatewayModule } from '../gateway/gateway.module.js'
import { SignatureVerifierService } from './signature-verifier.service.js'
import { WEBHOOKS_REPOSITORY } from './webhooks-repository.interface.js'
import { WebhooksController } from './webhooks.controller.js'
import { WebhooksRepository } from './webhooks.repository.js'
import { WebhooksService } from './webhooks.service.js'
import { WebhookUpdatesService } from './webhook-updates.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([WebhookSubscription, WebhookEvent, Order, CheckoutLink, Withdrawal]), GatewayAccountModule, GatewayModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository, WebhookUpdatesService, SignatureVerifierService, TokenCipherService,
    { provide: WEBHOOKS_REPOSITORY, useExisting: WebhooksRepository }],
})
export class WebhooksModule {}
