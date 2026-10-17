import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsUrl } from 'class-validator'

export enum WebhookEventType {
  PaymentPix = 'PAYMENT_PIX',
  PaymentCard = 'PAYMENT_CARD',
  Withdrawal = 'WITHDRAWAL',
}

export class RegisterWebhookDto {
  @ApiProperty({ enum: WebhookEventType })
  @IsEnum(WebhookEventType)
  event: WebhookEventType

  @ApiProperty({ example: 'https://api.seu-dominio.com' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  callbackBaseUrl: string
}
