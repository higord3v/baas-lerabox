import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16)
    const derived = await scrypt(password, salt, 64) as Buffer
    return `${salt.toString('base64url')}:${derived.toString('base64url')}`
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [saltText, hashText] = stored.split(':')
    if (!saltText || !hashText) return false
    const expected = Buffer.from(hashText, 'base64url')
    if (expected.length !== 64) return false
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), 64) as Buffer
    return timingSafeEqual(actual, expected)
  }
}
