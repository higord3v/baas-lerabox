import { randomBytes } from 'node:crypto'
import { TokenCipherService } from './token-cipher.service.js'

describe('TokenCipherService', () => {
  it('encrypts gateway secrets with authenticated encryption', () => {
    vi.stubEnv('BAAS_TOKEN_ENCRYPTION_KEY', randomBytes(32).toString('base64'))
    try {
      const cipher = new TokenCipherService()
      const encrypted = cipher.encrypt('gateway-token')
      expect(encrypted).not.toContain('gateway-token')
      expect(cipher.decrypt(encrypted)).toBe('gateway-token')
      expect(() => cipher.decrypt(`${encrypted.slice(0, -1)}x`)).toThrow()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
