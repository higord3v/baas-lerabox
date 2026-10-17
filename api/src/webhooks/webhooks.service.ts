import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { WebhookEvent } from '../database/entities/webhook-event.entity.js'
import { WebhookSubscription } from '../database/entities/webhook-subscription.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { TokenCipherService } from '../gateway-account/token-cipher.service.js'
import { GatewayHttpService } from '../gateway/gateway-http.service.js'
import { RegisterWebhookDto } from './dto/register-webhook.dto.js'
import { WebhookSubscriptionResponseDto } from './dto/webhook-subscription-response.dto.js'
import { parseWebhookPayload } from './webhook-payload.js'
import { WEBHOOKS_REPOSITORY, type WebhooksRepositoryPort } from './webhooks-repository.interface.js'
import { SignatureVerifierService } from './signature-verifier.service.js'
import { WebhookUpdatesService } from './webhook-updates.service.js'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    @Inject(WEBHOOKS_REPOSITORY) private readonly repository: WebhooksRepositoryPort,
    private readonly gateway: GatewayHttpService,
    private readonly accounts: GatewayAccountService,
    private readonly cipher: TokenCipherService,
    private readonly signatures: SignatureVerifierService,
    private readonly updates: WebhookUpdatesService,
  ) {}

  async register(userId: string, input: RegisterWebhookDto, correlationId: string): Promise<WebhookSubscriptionResponseDto> {
    const base = new URL(input.callbackBaseUrl)
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
      throw new BadRequestException('Informe uma URL base HTTPS pública')
    }
    const token = await this.accounts.accessTokenForUser(userId)
    const subscription = await this.repository.findOwnedSubscription(userId, input.event) ?? new WebhookSubscription()
    const secret = subscription.encryptedSecret ? this.cipher.decrypt(subscription.encryptedSecret) : randomBytes(32).toString('hex')
    subscription.id ||= randomUUID()
    subscription.userId = userId
    subscription.eventType = input.event
    subscription.encryptedSecret ||= this.cipher.encrypt(secret)
    subscription.callbackUrl = `${base.href.replace(/\/$/, '')}/webhooks/lera-box/${subscription.id}`
    subscription.registeredAt = null
    await this.repository.saveSubscription(subscription)
    await this.gateway.registerWebhook({ event: input.event, url: subscription.callbackUrl, secret }, token, correlationId)
    subscription.registeredAt = new Date()
    await this.repository.saveSubscription(subscription)
    return toResponse(subscription)
  }

  async list(userId: string): Promise<WebhookSubscriptionResponseDto[]> {
    return (await this.repository.listSubscriptions(userId)).map(toResponse)
  }

  async receive(subscriptionId: string, rawBody: Buffer | undefined, signature: string | undefined,
    body: unknown): Promise<{ received: true }> {
    const subscription = await this.repository.findSubscription(subscriptionId)
    if (!subscription) throw new NotFoundException('Webhook não encontrado')
    const payload = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown> : { invalidBody: body }
    const valid = this.signatures.verify(rawBody, signature, this.cipher.decrypt(subscription.encryptedSecret))
    const event = new WebhookEvent()
    event.id = randomUUID()
    event.userId = subscription.userId
    event.eventType = subscription.eventType
    event.payload = payload
    event.signatureValid = valid
    event.processingStatus = valid ? 'RECEIVED' : 'FAILED'
    event.processedAt = null
    event.errorMessage = valid ? null : 'Assinatura inválida'
    const rawHash = createHash('sha256').update(rawBody ?? Buffer.alloc(0)).digest('hex')
    const candidateId = typeof payload.eventId === 'string' ? payload.eventId : null
    event.eventKey = valid ? `${subscription.eventType}:${candidateId ?? rawHash}`.slice(0, 128)
      : `INVALID:${subscription.eventType}:${rawHash}`.slice(0, 128)
    event.externalReference = null
    if (valid) {
      try {
        const parsed = parseWebhookPayload(payload, subscription.eventType)
        event.externalReference = parsed.externalReference
        if (parsed.eventId) event.eventKey = `${subscription.eventType}:${parsed.eventId}`.slice(0, 128)
      } catch (error) {
        event.processingStatus = 'FAILED'
        event.errorMessage = error instanceof Error ? error.message : 'Payload inválido'
        await this.repository.insertEvent(event)
        throw error
      }
    }
    await this.repository.insertEvent(event)
    if (!valid) throw new UnauthorizedException('Assinatura de webhook inválida')
    try {
      const parsed = parseWebhookPayload(payload, subscription.eventType)
      const applied = await this.repository.applyEvent(event, parsed)
      if (applied) {
        const update = { event: subscription.eventType, status: parsed.status }
        this.updates.publish(subscription.userId, update)
        if (applied.checkoutLinkId) this.updates.publishCheckout(applied.checkoutLinkId, update)
      }
    } catch (error) {
      this.logger.warn(`Falha ao processar webhook ${event.eventKey}: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
      await this.repository.markFailed(event.userId, event.eventKey, error instanceof Error ? error.message : 'Falha de processamento')
      throw error
    }
    return { received: true }
  }
}

function toResponse(subscription: WebhookSubscription): WebhookSubscriptionResponseDto {
  return { event: subscription.eventType, url: subscription.callbackUrl, registered: subscription.registeredAt !== null }
}
