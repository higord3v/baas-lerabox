import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NestExpressApplication } from '@nestjs/platform-express'
import { randomInt, randomUUID } from 'node:crypto'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module.js'
import { CheckoutLink } from '../src/database/entities/checkout-link.entity.js'
import { databaseOptions } from '../src/database/database-options.js'
import { GatewayHttpService } from '../src/gateway/gateway-http.service.js'

describe('wallet and statement', () => {
  let app: INestApplication
  let database: DataSource
  const documentPrefix = randomInt(100_000_000, 999_999_999)
  const document = (suffix: string) => `${documentPrefix}${suffix}`
  const gateway = {
    createUser: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockImplementation(async (input: { document: string }) => ({
      accessToken: `gateway-${input.document}`,
      customerCode: `customer-${input.document}`,
      storeKey: 'store-key',
    })),
    getWallet: vi.fn().mockImplementation(async (token: string) => ({
      balanceCents: token === `gateway-${document('01')}` ? 12500 : 7800,
    })),
    getTransactions: vi.fn().mockImplementation(async (_query: unknown, token: string) => ([{
      id: token, type: 'PIX', status: 'APPROVED', amountCents: 1000,
      description: 'Venda', externalReference: `ORD-${token}`, occurredAt: new Date().toISOString(),
    }])),
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

  async function merchant(suffix: string): Promise<string> {
    const email = `${randomUUID()}@example.com`
    await request(app.getHttpServer()).post('/auth/register').send({
      personType: 'PF', name: 'Test Merchant', email, phone: '11999998888', document: document(suffix),
      zipCode: '01310100', address: 'Main Street', number: '1', neighborhood: 'Center',
      city: 'São Paulo', state: 'SP', localPassword: 'local-password-123',
    }).expect(201)
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'local-password-123' }).expect(201)
    const token = login.body.accessToken as string
    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${token}`)
      .send({ document: document(suffix), password: 'gateway-password' }).expect(201)
    return token
  }

  it('protects routes, validates filters, and isolates each merchant statement', async () => {
    const tokenA = await merchant('01')
    const tokenB = await merchant('02')
    await request(app.getHttpServer()).get('/wallet').expect(401)
    await request(app.getHttpServer()).get('/wallet/transactions').expect(401)
    await request(app.getHttpServer()).get('/wallet/transactions').set('Authorization', 'Bearer invalid').expect(401)
    await request(app.getHttpServer()).get('/wallet/transactions?limit=0')
      .set('Authorization', `Bearer ${tokenA}`).expect(400)

    const balance = await request(app.getHttpServer()).get('/wallet')
      .set('Authorization', `Bearer ${tokenA}`).expect(200)
    expect(balance.body).toEqual({ balanceCents: 12500 })

    const created = await request(app.getHttpServer()).post('/checkout-links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amountCents: 2500, method: 'PIX', description: 'Link expirado', expiresAt: '2099-01-01T00:00:00.000Z' })
      .expect(201)
    await database.getRepository(CheckoutLink).update(created.body.id as string, { expiresAt: new Date('2020-01-01T00:00:00.000Z') })

    const statementA = await request(app.getHttpServer()).get('/wallet/transactions?status=EXPIRED&type=PIX&limit=10')
      .set('Authorization', `Bearer ${tokenA}`).expect(200)
    expect(statementA.body.items).toContainEqual(expect.objectContaining({ id: created.body.id, status: 'EXPIRED' }))
    const statementB = await request(app.getHttpServer()).get('/wallet/transactions?status=EXPIRED&type=PIX&limit=10')
      .set('Authorization', `Bearer ${tokenB}`).expect(200)
    expect(statementB.body.items).not.toContainEqual(expect.objectContaining({ id: created.body.id }))
    expect(gateway.getTransactions).toHaveBeenCalledWith(expect.objectContaining({ status: 'EXPIRED', type: 'PIX', limit: 10 }),
      `gateway-${document('01')}`, expect.any(String))
  })
})
