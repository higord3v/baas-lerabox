import { ApiProperty } from '@nestjs/swagger'

export class WithdrawalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ example: 10000, description: 'Valor em centavos' })
  amountCents: number

  @ApiProperty({ example: 'PENDING' })
  status: string

  @ApiProperty({ example: 'WD-77777777-7777-4777-8777-777777777777' })
  externalReference: string

  @ApiProperty({ format: 'date-time' })
  createdAt: Date
}
