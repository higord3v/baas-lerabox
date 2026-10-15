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
      const parts = encrypted.split(':')
      parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`
      expect(() => cipher.decrypt(parts.join(':'))).toThrow()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
