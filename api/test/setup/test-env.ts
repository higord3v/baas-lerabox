import { randomBytes } from 'node:crypto'

const testDatabase = process.env.DB_NAME_TEST
if (!testDatabase || testDatabase === (process.env.DB_NAME ?? 'baas')) {
  throw new Error('DB_NAME_TEST must name a separate MySQL database')
}

process.env.DB_NAME = testDatabase
process.env.BAAS_SESSION_SECRET = randomBytes(48).toString('base64url')
process.env.BAAS_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
