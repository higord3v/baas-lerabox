import { Injectable } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'

@Injectable()
export class SignatureVerifierService {
  verify(rawBody: Buffer | undefined, signature: string | undefined, secret: string): boolean {
    if (!rawBody || !signature) return false
    const hex = signature.startsWith('sha256=') ? signature.slice(7) : signature
    if (!/^[0-9a-f]{64}$/i.test(hex)) return false
    const expected = createHmac('sha256', secret).update(rawBody).digest()
    return timingSafeEqual(expected, Buffer.from(hex, 'hex'))
  }
}
