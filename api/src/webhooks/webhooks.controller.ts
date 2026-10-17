import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { Public } from '../auth/public.decorator.js'
import { RegisterWebhookDto } from './dto/register-webhook.dto.js'
import { WebhookSubscriptionResponseDto } from './dto/webhook-subscription-response.dto.js'
import { WebhooksService } from './webhooks.service.js'

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

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
