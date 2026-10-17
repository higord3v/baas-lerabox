import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req, Sse, type MessageEvent } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { Public } from '../auth/public.decorator.js'
import { RegisterWebhookDto } from './dto/register-webhook.dto.js'
import { WebhookSubscriptionResponseDto } from './dto/webhook-subscription-response.dto.js'
import { WebhooksService } from './webhooks.service.js'
import { WebhookUpdatesService } from './webhook-updates.service.js'
import type { Observable } from 'rxjs'

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService, private readonly updates: WebhookUpdatesService) {}

  @Sse('updates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notifica o lojista sobre eventos processados por webhook' })
  updatesStream(@Req() request: AuthenticatedRequest): Observable<MessageEvent> {
    return this.updates.stream(request.userId)
  }

  @Sse('checkout/:linkId/updates')
  @Public()
  @ApiOperation({ summary: 'Notifica a página pública sobre atualizações do checkout' })
  checkoutUpdates(@Param('linkId', ParseUUIDPipe) linkId: string): Observable<MessageEvent> {
    return this.updates.checkoutStream(linkId)
  }

  @Post('subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastra ou atualiza um callback no gateway' })
  @ApiCreatedResponse({ type: WebhookSubscriptionResponseDto })
  register(@Req() request: AuthenticatedRequest, @Body() input: RegisterWebhookDto): Promise<WebhookSubscriptionResponseDto> {
    return this.webhooks.register(request.userId, input, request.correlationId)
  }

  @Get('subscriptions')
  @ApiBearerAuth()
  @ApiOkResponse({ type: WebhookSubscriptionResponseDto, isArray: true })
  list(@Req() request: AuthenticatedRequest): Promise<WebhookSubscriptionResponseDto[]> {
    return this.webhooks.list(request.userId)
  }

  @Post('lera-box/:subscriptionId')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Recebe evento assinado do gateway' })
  receive(@Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Req() request: RawBodyRequest<Request>, @Headers('x-lera-box-signature') signature: string | undefined,
    @Body() body: unknown): Promise<{ received: true }> {
    return this.webhooks.receive(subscriptionId, request.rawBody, signature, body)
  }
}
