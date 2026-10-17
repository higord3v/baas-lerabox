import { BadRequestException } from '@nestjs/common'
import { WebhookSubscription } from '../database/entities/webhook-subscription.entity.js'

export interface WebhookPayload {
  eventId: string | null
  externalReference: string | null
  gatewayId: string | null
  status: 'APPROVED' | 'DENIED'
  amount: number | null
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function parseWebhookPayload(body: Record<string, unknown>, event: WebhookSubscription['eventType']): WebhookPayload {
  const declaredEvent = string(body.event) ?? string(body.eventType)
  if (declaredEvent && declaredEvent !== event) throw new BadRequestException('Evento de webhook divergente')
  const details = record(body.data) ?? record(body.payment) ?? record(body.withdrawal) ?? body
  const metadata = record(details.metadata) ?? {}
  const status = string(details.status) ?? string(body.status)
  const externalReference = string(details.externalReference) ?? string(body.externalReference) ?? string(metadata.externalReference)
  const gatewayId = string(details.id) ?? string(details.paymentId) ?? string(details.withdrawalId)
  const amount = details.amount ?? body.amount
  if ((status !== 'APPROVED' && status !== 'DENIED') || (!externalReference && !gatewayId)
    || (amount != null && (!Number.isSafeInteger(amount) || (amount as number) < 0))) {
    throw new BadRequestException('Payload de webhook inválido')
  }
  return { eventId: string(body.eventId) ?? string(body.id), externalReference, gatewayId,
    status, amount: amount == null ? null : amount as number }
}
