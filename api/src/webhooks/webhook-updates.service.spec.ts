import { WebhookUpdatesService } from './webhook-updates.service.js'

describe('WebhookUpdatesService', () => {
  it('delivers updates only to listeners of the same merchant', () => {
    const service = new WebhookUpdatesService()
    const merchantA: unknown[] = []
    const merchantB: unknown[] = []
    const checkoutA: unknown[] = []
    const checkoutB: unknown[] = []
    const subscriptionA = service.stream('merchant-a').subscribe((message) => merchantA.push(message.data))
    const subscriptionB = service.stream('merchant-b').subscribe((message) => merchantB.push(message.data))
    const linkA = service.checkoutStream('link-a').subscribe((message) => checkoutA.push(message.data))
    const linkB = service.checkoutStream('link-b').subscribe((message) => checkoutB.push(message.data))

    service.publish('merchant-a', { event: 'PAYMENT_PIX', status: 'APPROVED' })
    service.publishCheckout('link-a', { event: 'PAYMENT_PIX', status: 'APPROVED' })

    expect(merchantA).toContainEqual({ event: 'PAYMENT_PIX', status: 'APPROVED' })
    expect(merchantB).toEqual([{ connected: true }])
    expect(checkoutA).toContainEqual({ event: 'PAYMENT_PIX', status: 'APPROVED' })
    expect(checkoutB).toEqual([{ connected: true }])
    subscriptionA.unsubscribe()
    subscriptionB.unsubscribe()
    linkA.unsubscribe()
    linkB.unsubscribe()
  })
})
