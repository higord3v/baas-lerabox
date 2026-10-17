import { ApiProperty } from '@nestjs/swagger'
import { WebhookEventType } from './register-webhook.dto.js'

export class WebhookSubscriptionResponseDto {
  @ApiProperty({ enum: WebhookEventType })
  event: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL'

  @ApiProperty()
  url: string

  @ApiProperty()
  registered: boolean
}
