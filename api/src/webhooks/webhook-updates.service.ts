import { Injectable, type MessageEvent } from '@nestjs/common'
import { Observable, type Subscriber, interval, map, merge } from 'rxjs'

export interface WebhookUpdate {
  event: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL'
  status: 'APPROVED' | 'DENIED'
}

@Injectable()
export class WebhookUpdatesService {
  private readonly merchantSubscribers = new Map<string, Set<Subscriber<MessageEvent>>>()
  private readonly checkoutSubscribers = new Map<string, Set<Subscriber<MessageEvent>>>()

  stream(userId: string): Observable<MessageEvent> {
    return this.subscribe(this.merchantSubscribers, userId)
  }

  checkoutStream(linkId: string): Observable<MessageEvent> {
    return this.subscribe(this.checkoutSubscribers, linkId)
  }

  publish(userId: string, update: WebhookUpdate): void {
    this.send(this.merchantSubscribers, userId, update)
  }

  publishCheckout(linkId: string, update: WebhookUpdate): void {
    this.send(this.checkoutSubscribers, linkId, update)
  }

  private subscribe(subscribers: Map<string, Set<Subscriber<MessageEvent>>>, key: string): Observable<MessageEvent> {
    return merge(new Observable<MessageEvent>((subscriber) => {
      const listeners = subscribers.get(key) ?? new Set<Subscriber<MessageEvent>>()
      listeners.add(subscriber)
      subscribers.set(key, listeners)
      subscriber.next({ data: { connected: true } })
      return () => {
        listeners.delete(subscriber)
        if (listeners.size === 0) subscribers.delete(key)
      }
    }), interval(25000).pipe(map((): MessageEvent => ({ data: { heartbeat: true } }))))
  }

  private send(subscribers: Map<string, Set<Subscriber<MessageEvent>>>, key: string, update: WebhookUpdate): void {
    for (const subscriber of subscribers.get(key) ?? []) {
      subscriber.next({ data: update })
    }
  }
}
