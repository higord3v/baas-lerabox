import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { AuthenticatedRequest } from './authenticated-request.js'
import { IS_PUBLIC_KEY } from './public.decorator.js'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException()
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token)
      if (!payload.sub) throw new UnauthorizedException()
      request.userId = payload.sub
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
