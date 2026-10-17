import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NestExpressApplication } from '@nestjs/platform-express'
import { randomInt, randomUUID } from 'node:crypto'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module.js'
import { databaseOptions } from '../src/database/database-options.js'
import { Withdrawal } from '../src/database/entities/withdrawal.entity.js'
import { GatewayHttpService } from '../src/gateway/gateway-http.service.js'

describe('withdrawals', () => {
  let app: INestApplication
  let database: DataSource
  const documentPrefix = randomInt(100_000_000, 999_999_999)
  const document = (suffix: string) => `${documentPrefix}${suffix}`
  const statuses = new Map<string, string>()
  const gateway = {
    createUser: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockImplementation(async (input: { document: string }) => ({
      accessToken: `gateway-${input.document}`, customerCode: `customer-${input.document}`, storeKey: 'store-key',
    })),
    createWithdrawal: vi.fn().mockImplementation(async (input: { amount: number; externalReference: string }) => {
      const id = randomUUID()
      statuses.set(id, 'PENDING')
      return { id, amount: input.amount, externalReference: input.externalReference, status: 'APPROVED' }
    }),
    getWithdrawal: vi.fn().mockImplementation(async (id: string) => ({
      id, status: statuses.get(id), amount: null, externalReference: null,
    })),
    getTransactions: vi.fn().mockResolvedValue([]),
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

  it('protects, validates, deduplicates and isolates withdrawal requests', async () => {
    const tokenA = await merchant('01')
    const tokenB = await merchant('02')
    const payload = { requestId: randomUUID(), amountCents: 10000, pixKey: 'owner@example.com',
      document: '12345678901', description: 'Conta pessoal' }
    await request(app.getHttpServer()).post('/withdrawals').send(payload).expect(401)
    await request(app.getHttpServer()).get('/withdrawals').expect(401)
    await request(app.getHttpServer()).get(`/withdrawals/${randomUUID()}`).expect(401)
    await request(app.getHttpServer()).get('/withdrawals').set('Authorization', 'Bearer invalid').expect(401)
    await request(app.getHttpServer()).post('/withdrawals').set('Authorization', `Bearer ${tokenA}`)
      .send({ ...payload, amountCents: 0 }).expect(400)
    await request(app.getHttpServer()).post('/withdrawals').set('Authorization', `Bearer ${tokenA}`)
      .send({ ...payload, document: 'bad' }).expect(400)

    const created = await request(app.getHttpServer()).post('/withdrawals')
      .set('Authorization', `Bearer ${tokenA}`).send(payload).expect(201)
    expect(created.body).toMatchObject({ amountCents: 10000, status: 'PENDING', externalReference: `WD-${payload.requestId}` })
    expect(JSON.stringify(created.body)).not.toContain(payload.pixKey)
    const repeated = await request(app.getHttpServer()).post('/withdrawals')
      .set('Authorization', `Bearer ${tokenA}`).send(payload).expect(201)
    expect(repeated.body.id).toBe(created.body.id)
    expect(gateway.createWithdrawal).toHaveBeenCalledTimes(1)
    await request(app.getHttpServer()).post('/withdrawals').set('Authorization', `Bearer ${tokenA}`)
      .send({ ...payload, amountCents: 20000 }).expect(409)

    const id = created.body.id as string
    const stored = await database.getRepository(Withdrawal).createQueryBuilder('withdrawal')
      .addSelect('withdrawal.encryptedDestination').where('withdrawal.id = :id', { id }).getOneOrFail()
    expect(stored.encryptedDestination).not.toContain(payload.pixKey)
    const owned = await request(app.getHttpServer()).get('/withdrawals')
      .set('Authorization', `Bearer ${tokenA}`).expect(200)
    expect(owned.body).toContainEqual(expect.objectContaining({ id }))
    const other = await request(app.getHttpServer()).get('/withdrawals')
      .set('Authorization', `Bearer ${tokenB}`).expect(200)
    expect(other.body).not.toContainEqual(expect.objectContaining({ id }))
    await request(app.getHttpServer()).get(`/withdrawals/${id}`)
      .set('Authorization', `Bearer ${tokenB}`).expect(404)

    const statement = await request(app.getHttpServer()).get('/wallet/transactions?type=WITHDRAWAL')
      .set('Authorization', `Bearer ${tokenA}`).expect(200)
    expect(statement.body.items).toContainEqual(expect.objectContaining({ id, type: 'WITHDRAWAL', status: 'PENDING' }))
    statuses.set(stored.gatewayWithdrawalId!, 'APPROVED')
    const detail = await request(app.getHttpServer()).get(`/withdrawals/${id}`)
      .set('Authorization', `Bearer ${tokenA}`).expect(200)
    expect(detail.body.status).toBe('APPROVED')
    expect((await database.getRepository(Withdrawal).findOneByOrFail({ id })).status).toBe('APPROVED')
  })
})
