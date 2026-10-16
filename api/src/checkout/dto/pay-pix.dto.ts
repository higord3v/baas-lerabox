import { ApiProperty } from '@nestjs/swagger'
import { IsUUID, Matches } from 'class-validator'

export class PayPixDto {
  @ApiProperty({ description: 'CPF ou CNPJ do pagador, apenas dígitos' })
  @Matches(/^(?:\d{11}|\d{14})$/)
  payerDocument: string

  @ApiProperty({ description: 'UUID da tentativa para evitar cobranças repetidas' })
  @IsUUID()
  attemptKey: string
}
