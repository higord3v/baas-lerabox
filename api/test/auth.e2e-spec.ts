import { ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DataSource } from 'typeorm'
import request from 'supertest'
import { randomInt, randomUUID } from 'node:crypto'
import { AppModule } from '../src/app.module.js'
import { GatewayAccount } from '../src/database/entities/gateway-account.entity.js'
import { databaseOptions } from '../src/database/database-options.js'
import { GatewayHttpService } from '../src/gateway/gateway-http.service.js'

describe('merchant and gateway account authentication', () => {
  let app: INestApplication
  let dataSource: DataSource
  const gateway = {
    createUser: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockImplementation(async ({ document }: { document: string }) => ({
      accessToken: `gateway-token-${document}`,
      customerCode: `C-${document}`,
      storeKey: `L-${document}`,
    })),
  }

  beforeAll(async () => {
    dataSource = new DataSource(databaseOptions)
    await dataSource.initialize()
    await dataSource.runMigrations()

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GatewayHttpService)
      .useValue(gateway)
      .compile()
    app = module.createNestApplication<NestExpressApplication>({ rawBody: true })
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
    await dataSource?.destroy()
  })

  it('enforces session auth and account isolation while encrypting gateway secrets', async () => {
    const suffix = randomUUID().slice(0, 8)
    const firstEmail = `merchant-a-${suffix}@example.com`
    const secondEmail = `merchant-b-${suffix}@example.com`
    const firstDocument = randomInt(10_000_000_000, 100_000_000_000).toString()
    const secondDocument = randomInt(10_000_000_000, 100_000_000_000).toString()

    const register = (email: string, document: string) => request(app.getHttpServer())
      .post('/auth/register')
      .send({
        personType: 'PF', name: 'Maria Silva', email, phone: '11999998888',
        document, zipCode: '01310100', address: 'Av. Paulista', number: '1000',
        neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP',
        localPassword: 'local-password-123',
      })

    await register(firstEmail, firstDocument).expect(201)
    await register(secondEmail, secondDocument).expect(201)
    expect(gateway.createUser).toHaveBeenCalledTimes(2)
    expect(gateway.createUser.mock.calls[0][0]).not.toHaveProperty('localPassword')

    await request(app.getHttpServer()).get('/gateway-account').expect(401)
    await request(app.getHttpServer()).get('/gateway-account')
      .set('Authorization', 'Bearer invalid').expect(401)
    await request(app.getHttpServer()).post('/gateway-account/login')
      .send({ document: firstDocument, password: 'gateway-password' }).expect(401)

    const firstLogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: firstEmail, password: 'local-password-123' }).expect(201)
    const secondLogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: secondEmail, password: 'local-password-123' }).expect(201)
    const firstToken = firstLogin.body.accessToken as string
    const secondToken = secondLogin.body.accessToken as string

    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ document: firstDocument, password: 'gateway-password' })
      .expect(201, { connected: true })

    await request(app.getHttpServer()).get('/gateway-account')
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(200, { connected: true })
    await request(app.getHttpServer()).get('/gateway-account')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200, { connected: false })

    await request(app.getHttpServer()).post('/gateway-account/login')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ document: firstDocument, password: 'gateway-password' })
      .expect(409)

    const profile = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${firstToken}`).expect(200)
    const account = await dataSource.getRepository(GatewayAccount)
      .createQueryBuilder('account')
      .addSelect('account.encryptedAccessToken')
      .addSelect('account.encryptedStoreKey')
      .where('account.userId = :userId', { userId: profile.body.id as string })
      .getOneOrFail()
    expect(account.encryptedAccessToken).toMatch(/^v1:/)
    expect(account.encryptedAccessToken).not.toContain('gateway-token')
    expect(account.encryptedStoreKey).not.toContain(`L-${firstDocument}`)
    expect(firstLogin.body).not.toHaveProperty('gatewayToken')
  })

  it('rejects invalid registration data before calling the gateway', async () => {
    gateway.createUser.mockClear()
    await request(app.getHttpServer()).post('/auth/register').send({ personType: 'PF' }).expect(400)
    expect(gateway.createUser).not.toHaveBeenCalled()
  })
})
