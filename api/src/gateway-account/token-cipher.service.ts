import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

@Injectable()
export class TokenCipherService {
  private readonly key: Buffer

  constructor() {
    const encodedKey = process.env.BAAS_TOKEN_ENCRYPTION_KEY
    this.key = encodedKey ? Buffer.from(encodedKey, 'base64') : Buffer.alloc(0)
    if (this.key.length !== 32) throw new Error('BAAS_TOKEN_ENCRYPTION_KEY must be 32 bytes in base64')
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':')
  }

  decrypt(encrypted: string): string {
    const [version, ivText, tagText, ciphertextText] = encrypted.split(':')
    if (version !== 'v1' || !ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted value')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivText, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8')
  }
}
