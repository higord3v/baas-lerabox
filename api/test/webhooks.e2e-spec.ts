import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NestExpressApplication } from '@nestjs/platform-express'
import { createHmac, randomInt, randomUUID } from 'node:crypto'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module.js'
import { databaseOptions } from '../src/database/database-options.js'
import { CheckoutLink } from '../src/database/entities/checkout-link.entity.js'
import { Order } from '../src/database/entities/order.entity.js'
import { WebhookEvent } from '../src/database/entities/webhook-event.entity.js'
import { Withdrawal } from '../src/database/entities/withdrawal.entity.js'
import { GatewayHttpService } from '../src/gateway/gateway-http.service.js'
import { TokenCipherService } from '../src/gateway-account/token-cipher.service.js'

describe('gateway webhooks', () => {
  let app: INestApplication
  let database: DataSource
  let cipher: TokenCipherService
  const prefix = randomInt(100_000_000, 999_999_999)
  const registered: { event: string; url: string; secret: string }[] = []
  const gateway = {
    createUser: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockImplementation(async (input: { document: string }) => ({
      accessToken: `gateway-${input.document}`, customerCode: `customer-${input.document}`, storeKey: 'store-key',
    })),
    registerWebhook: vi.fn().mockImplementation(async (input: { event: string; url: string; secret: string }) => {
      registered.push(input)
    }),
  }

  beforeAll(async () => {
    database = new DataSource(databaseOptions)
    await database.initialize()
    await database.runMigrations()
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GatewayHttpService).useValue(gateway).compile()
    app = module.createNestApplication<NestExpressApplication>({ rawBody: true })
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.init()
    await app.listen(0, '127.0.0.1')
    cipher = app.get(TokenCipherService)
  })

  afterAll(async () => {
    await app?.close()
    await database?.destroy()
  })

  async function merchant(suffix: string): Promise<{ token: string; userId: string }> {
    const email = `${randomUUID()}@example.com`
    const document = `${prefix}${suffix}`
    await request(app.getHttpServer()).post('/auth/register').send({
      personType: 'PF', name: 'Webhook Merchant', email, phone: '11999998888', document,
      zipCode: '01310100', address: 'Main Street', number: '1', neighborhood: 'Center',
      city: 'São Paulo', state: 'SP', localPassword: 'local-password-123',
    }).expect(201)
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'local-password-123' }).expect(201)
    const token = login.body.accessToken as string
    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${token}`).send({ document, password: 'gateway-password' }).expect(201)
    const profile = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${token}`).expect(200)
    return { token, userId: profile.body.id as string }
  }

  async function subscribe(token: string, event: string): Promise<{ path: string; secret: string }> {
    const response = await request(app.getHttpServer()).post('/webhooks/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ event, callbackBaseUrl: 'https://baas.example.com' }).expect(201)
    const url = response.body.url as string
    const registeredWebhook = registered.at(-1)!
    expect(registeredWebhook).toMatchObject({ event, url })
    expect(JSON.stringify(response.body)).not.toContain(registeredWebhook.secret)
    return { path: new URL(url).pathname, secret: registeredWebhook.secret }
  }

  function signedPost(path: string, secret: string, payload: object) {
    const raw = JSON.stringify(payload)
    const signature = createHmac('sha256', secret).update(raw).digest('hex')
    return request(app.getHttpServer()).post(path).set('X-Lera-Box-Signature', signature)
      .set('Content-Type', 'application/json').send(raw)
  }

  it('requires a merchant token to configure callbacks and validates the URL', async () => {
    const { token } = await merchant('11')
    await request(app.getHttpServer()).get('/webhooks/subscriptions').expect(401)
    await request(app.getHttpServer()).post('/webhooks/subscriptions').send({
      event: 'PAYMENT_PIX', callbackBaseUrl: 'https://baas.example.com',
    }).expect(401)
    await request(app.getHttpServer()).get('/webhooks/subscriptions')
      .set('Authorization', 'Bearer invalid').expect(401)
    await request(app.getHttpServer()).post('/webhooks/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ event: 'PAYMENT_PIX', callbackBaseUrl: 'http://localhost:3000' }).expect(400)
    await request(app.getHttpServer()).post('/webhooks/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ event: 'UNKNOWN', callbackBaseUrl: 'https://baas.example.com' }).expect(400)
  })

  it('audits invalid signatures and applies a signed Pix result once', async () => {
    const { token, userId } = await merchant('12')
    const { path, secret } = await subscribe(token, 'PAYMENT_PIX')
    const link = await database.getRepository(CheckoutLink).save({ userId, externalReference: `LINK-${randomUUID()}`,
      amountCents: 15000, method: 'PIX', status: 'ACTIVE', description: null, cardBrand: null,
      installments: null, feePercent: null, expiresAt: null })
    const order = await database.getRepository(Order).save({ userId, checkoutLinkId: link.id,
      externalReference: `ORD-${randomUUID()}`, attemptKey: null, gatewayPaymentId: randomUUID(), amountCents: 15000,
      status: 'PENDING', pixEmv: null, pixQrCodeBase64: null, pixTxid: null, cardBrand: null,
      installments: null, feePercent: null })
    const payload = { eventId: randomUUID(), event: 'PAYMENT_PIX', data: { id: order.gatewayPaymentId,
      externalReference: order.externalReference, amount: 15000, status: 'APPROVED' } }
    await request(app.getHttpServer()).post(path).send(payload).expect(401)
    expect((await database.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('PENDING')
    await signedPost(path, 'wrong-secret', payload).expect(401)
    await signedPost(path, secret, payload).expect(200)
    await signedPost(path, secret, payload).expect(200)
    expect((await database.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('APPROVED')
    expect((await database.getRepository(CheckoutLink).findOneByOrFail({ id: link.id })).status).toBe('PAID')
    const events = await database.getRepository(WebhookEvent).find({ where: { userId } })
    expect(events.filter((entry) => entry.signatureValid)).toHaveLength(1)
    expect(events.filter((entry) => !entry.signatureValid)).toHaveLength(1)
    expect(events.find((entry) => entry.signatureValid)?.processingStatus).toBe('PROCESSED')
  })

  it('handles denied card and withdrawal events while isolating subscriptions', async () => {
    const merchantA = await merchant('13')
    const merchantB = await merchant('14')
    const card = await subscribe(merchantA.token, 'PAYMENT_CARD')
    const otherCard = await subscribe(merchantB.token, 'PAYMENT_CARD')
    const withdrawalCallback = await subscribe(merchantA.token, 'WITHDRAWAL')
    const link = await database.getRepository(CheckoutLink).save({ userId: merchantA.userId,
      externalReference: `LINK-${randomUUID()}`, amountCents: 22000, method: 'CARD', status: 'ACTIVE',
      description: null, cardBrand: 'VISA', installments: 1, feePercent: '3.1900', expiresAt: null })
    const order = await database.getRepository(Order).save({ userId: merchantA.userId, checkoutLinkId: link.id,
      externalReference: `ORD-${randomUUID()}`, attemptKey: null, gatewayPaymentId: randomUUID(), amountCents: 22000,
      status: 'PENDING', pixEmv: null, pixQrCodeBase64: null, pixTxid: null, cardBrand: 'VISA',
      installments: 1, feePercent: '3.1900' })
    const cardPayload = { eventId: randomUUID(), data: { id: order.gatewayPaymentId,
      externalReference: order.externalReference, amount: 22000, status: 'DENIED' } }
    await signedPost(otherCard.path, card.secret, cardPayload).expect(401)
    await signedPost(card.path, card.secret, cardPayload).expect(200)
    expect((await database.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('DENIED')
    expect((await database.getRepository(CheckoutLink).findOneByOrFail({ id: link.id })).status).toBe('ACTIVE')

    const withdrawal = await database.getRepository(Withdrawal).save({ userId: merchantA.userId,
      externalReference: `WD-${randomUUID()}`, gatewayWithdrawalId: randomUUID(), amountCents: 5000,
      status: 'PENDING', destinationType: 'PIX', encryptedDestination: cipher.encrypt('destination') })
    await signedPost(withdrawalCallback.path, withdrawalCallback.secret, { eventId: randomUUID(),
      externalReference: withdrawal.externalReference, id: withdrawal.gatewayWithdrawalId,
      amount: 5000, status: 'DENIED' }).expect(200)
    expect((await database.getRepository(Withdrawal).findOneByOrFail({ id: withdrawal.id })).status).toBe('DENIED')
  })
})
