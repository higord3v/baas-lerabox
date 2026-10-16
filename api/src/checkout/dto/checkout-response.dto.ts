import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CheckoutLinkResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  publicUrl: string

  @ApiProperty()
  amountCents: number

  @ApiProperty({ enum: ['PIX', 'CARD'] })
  method: 'PIX' | 'CARD'

  @ApiPropertyOptional()
  description: string | null

  @ApiProperty()
  status: string

  @ApiPropertyOptional()
  cardBrand: string | null

  @ApiPropertyOptional()
  installments: number | null

  @ApiPropertyOptional()
  feePercent: string | null

  @ApiPropertyOptional()
  expiresAt: Date | null
}

export class PaymentResponseDto {
  @ApiProperty()
  orderId: string

  @ApiProperty()
  status: string

  @ApiPropertyOptional()
  emv: string | null

  @ApiPropertyOptional()
  qrCodeBase64: string | null

  @ApiPropertyOptional()
  txid: string | null
}

export class CardFeeDto {
  @ApiProperty()
  brand: string

  @ApiProperty()
  installments: number

  @ApiProperty()
  feePercent: number
}
