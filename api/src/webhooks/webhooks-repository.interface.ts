import { WebhookEvent } from '../database/entities/webhook-event.entity.js'
import { WebhookSubscription } from '../database/entities/webhook-subscription.entity.js'
import { WebhookPayload } from './webhook-payload.js'

export const WEBHOOKS_REPOSITORY = Symbol('WEBHOOKS_REPOSITORY')

export interface WebhooksRepositoryPort {
  findSubscription(id: string): Promise<WebhookSubscription | null>
  findOwnedSubscription(userId: string, event: WebhookSubscription['eventType']): Promise<WebhookSubscription | null>
  listSubscriptions(userId: string): Promise<WebhookSubscription[]>
  saveSubscription(subscription: WebhookSubscription): Promise<WebhookSubscription>
  insertEvent(event: WebhookEvent): Promise<void>
  applyEvent(event: WebhookEvent, payload: WebhookPayload): Promise<{ checkoutLinkId: string | null } | null>
  markFailed(userId: string, eventKey: string, message: string): Promise<void>
}
