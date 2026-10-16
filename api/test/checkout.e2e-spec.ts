import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NestExpressApplication } from '@nestjs/platform-express'
import { randomInt, randomUUID } from 'node:crypto'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module.js'
import { databaseOptions } from '../src/database/database-options.js'
import { GatewayHttpService, type GatewayPayment } from '../src/gateway/gateway-http.service.js'

describe('checkout links', () => {
  let app: INestApplication
  let database: DataSource
  const documentPrefix = randomInt(100_000_000, 999_999_999)
  const document = (suffix: string) => `${documentPrefix}${suffix}`
  const customerSuffix = randomUUID()
  const payments = new Map<string, GatewayPayment>()
  const gateway = {
    createUser: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue({ accessToken: 'test-token', customerCode: `merchant-one-${customerSuffix}`, storeKey: 'test-key' }),
    getFees: vi.fn().mockResolvedValue([{ brand: 'VISA', installments: 3, feePercent: 3.19 }]),
    createPix: vi.fn().mockImplementation(async (input: { amount: number; externalReference: string }) => {
      const payment: GatewayPayment = {
        id: randomUUID(), amount: input.amount, externalReference: input.externalReference,
        status: 'APPROVED', emv: 'pix-copy-paste', qrCodeBase64: 'data:image/png;base64,AAAA', txid: 'TEST-TX',
      }
      payments.set(payment.id, { ...payment, status: 'PENDING' })
      return payment
    }),
    createCardPayment: vi.fn().mockImplementation(async (input: { amount: number; externalReference: string }) => {
      const payment: GatewayPayment = {
        id: randomUUID(), amount: input.amount, externalReference: input.externalReference,
        status: 'APPROVED', emv: null, qrCodeBase64: null, txid: null,
      }
      payments.set(payment.id, { ...payment, status: 'PENDING' })
      return payment
    }),
    getPayment: vi.fn().mockImplementation(async (id: string) => payments.get(id)),
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
  })

  afterAll(async () => {
    await app?.close()
    await database?.destroy()
  })

  async function merchant(document: string): Promise<string> {
    const email = `${randomUUID()}@example.com`
    await request(app.getHttpServer()).post('/auth/register').send({
      personType: 'PF', name: 'Test Merchant', email, phone: '11999998888', document,
      zipCode: '01310100', address: 'Main Street', number: '1', neighborhood: 'Center',
      city: 'São Paulo', state: 'SP', localPassword: 'local-password-123',
    }).expect(201)
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'local-password-123' }).expect(201)
    return login.body.accessToken as string
  }

  it('protects merchant routes and isolates links between merchants', async () => {
    const tokenA = await merchant(document('01'))
    const tokenB = await merchant(document('02'))
    await request(app.getHttpServer()).get('/checkout-links').expect(401)
    await request(app.getHttpServer()).get('/checkout-links').set('Authorization', 'Bearer invalid').expect(401)
    await request(app.getHttpServer()).post('/checkout-links').send({ amountCents: 100, method: 'PIX' }).expect(401)
    await request(app.getHttpServer()).get('/checkout-links/fees?brand=VISA').expect(401)
    await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${tokenA}`).send({ amountCents: 0, method: 'PIX' }).expect(400)

    gateway.login.mockResolvedValueOnce({ accessToken: 'test-token', customerCode: `merchant-one-${customerSuffix}`, storeKey: 'test-key' })
    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${tokenA}`).send({ document: document('01'), password: 'gateway-password' }).expect(201)
    const created = await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amountCents: 15000, method: 'PIX', description: 'Test order' }).expect(201)
    const id = created.body.id as string
    await request(app.getHttpServer()).get(`/checkout-links/${id}`)
      .set('Authorization', `Bearer ${tokenB}`).expect(404)
    const otherList = await request(app.getHttpServer()).get('/checkout-links')
      .set('Authorization', `Bearer ${tokenB}`).expect(200)
    expect(otherList.body).not.toContainEqual(expect.objectContaining({ id }))
  })

  it('returns Pix instructions, deduplicates attempts and confirms status only after a gateway query', async () => {
    const token = await merchant(document('03'))
    gateway.login.mockResolvedValueOnce({ accessToken: 'pix-token', customerCode: `merchant-pix-${customerSuffix}`, storeKey: 'test-key' })
    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${token}`).send({ document: document('03'), password: 'gateway-password' }).expect(201)
    const created = await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${token}`).send({ amountCents: 15000, method: 'PIX' }).expect(201)
    const id = created.body.id as string
    const payload = { payerDocument: '12345678901', attemptKey: randomUUID() }
    const first = await request(app.getHttpServer()).post(`/checkout/${id}/pix`).send(payload).expect(201)
    expect(first.body).toMatchObject({ status: 'PENDING', emv: 'pix-copy-paste', txid: 'TEST-TX' })
    const second = await request(app.getHttpServer()).post(`/checkout/${id}/pix`).send(payload).expect(201)
    expect(second.body.orderId).toBe(first.body.orderId)
    expect(gateway.createPix).toHaveBeenCalledTimes(1)
    expect(gateway.createPix.mock.calls[0][0]).toMatchObject({ amount: 15000, payerDocument: payload.payerDocument })

    const paymentId = [...payments.keys()].at(-1)!
    payments.set(paymentId, { ...payments.get(paymentId)!, status: 'APPROVED' })
    const result = await request(app.getHttpServer()).get(`/checkout/${id}/orders/${first.body.orderId as string}`).expect(200)
    expect(result.body.status).toBe('APPROVED')
    const publicLink = await request(app.getHttpServer()).get(`/checkout/${id}`).expect(200)
    expect(publicLink.body.status).toBe('PAID')
    const repeated = await request(app.getHttpServer()).post(`/checkout/${id}/pix`).send(payload).expect(201)
    expect(repeated.body).toMatchObject({ orderId: first.body.orderId, status: 'APPROVED' })
    expect(gateway.createPix).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result.body)).not.toContain('test-token')
  })

  it('uses the current fee for card payments and does not trust the create response status', async () => {
    const token = await merchant(document('04'))
    gateway.login.mockResolvedValueOnce({ accessToken: 'card-token', customerCode: `merchant-card-${customerSuffix}`, storeKey: 'test-key' })
    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${token}`).send({ document: document('04'), password: 'gateway-password' }).expect(201)
    const created = await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 25000, method: 'CARD', cardBrand: 'VISA', installments: 3 }).expect(201)
    const id = created.body.id as string
    expect(Number(created.body.feePercent)).toBe(3.19)
    const paid = await request(app.getHttpServer()).post(`/checkout/${id}/card`).send({
      cardNumber: '4111111111111111', cardHolder: 'Test Customer', expiryMonth: '12',
      expiryYear: '2030', cvv: '123', attemptKey: randomUUID(),
    }).expect(201)
    expect(paid.body.status).toBe('PENDING')
    expect(gateway.createCardPayment.mock.calls[0][0]).toMatchObject({ amount: 25000, installments: 3, feePercent: 3.19 })
    expect(JSON.stringify(paid.body)).not.toContain('4111111111111111')

    const another = await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 25000, method: 'CARD', cardBrand: 'VISA', installments: 3 }).expect(201)
    gateway.getFees.mockResolvedValueOnce([{ brand: 'VISA', installments: 3, feePercent: 3.29 }])
    await request(app.getHttpServer()).post(`/checkout/${another.body.id as string}/card`).send({
      cardNumber: '4111111111111111', cardHolder: 'Test Customer', expiryMonth: '12',
      expiryYear: '2030', cvv: '123', attemptKey: randomUUID(),
    }).expect(409)
    expect(gateway.createCardPayment).toHaveBeenCalledTimes(1)
  })
})
