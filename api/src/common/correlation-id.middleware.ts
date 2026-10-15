import { Injectable, NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { AuthenticatedRequest } from '../auth/authenticated-request.js'

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const correlationId = randomUUID()
    const correlatedRequest = request as AuthenticatedRequest
    correlatedRequest.correlationId = correlationId
    response.setHeader('X-Correlation-Id', correlationId)
    next()
  }
}
