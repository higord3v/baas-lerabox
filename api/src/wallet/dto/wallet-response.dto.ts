import { ApiProperty } from '@nestjs/swagger'
import type { GatewayTransactionStatus, GatewayTransactionType } from '../../gateway/gateway-http.service.js'

export class WalletResponseDto {
  @ApiProperty({ example: 15000, description: 'Saldo em centavos' })
  balanceCents: number
}

export class StatementEntryDto {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: ['PIX', 'CREDIT_CARD', 'WITHDRAWAL'] })
  type: GatewayTransactionType

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CANCELLED'] })
  status: GatewayTransactionStatus

  @ApiProperty({ example: 15000, description: 'Valor em centavos' })
  amountCents: number

  @ApiProperty({ nullable: true })
  description: string | null

  @ApiProperty({ nullable: true })
  externalReference: string | null

  @ApiProperty({ format: 'date-time' })
  occurredAt: string

  @ApiProperty({ enum: ['gateway', 'checkout'] })
  source: 'gateway' | 'checkout'
}

export class StatementResponseDto {
  @ApiProperty({ type: [StatementEntryDto] })
  items: StatementEntryDto[]
}
