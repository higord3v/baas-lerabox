import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MinLength } from 'class-validator'

export class ConnectGatewayAccountDto {
  @ApiProperty({ description: 'CPF ou CNPJ usado no gateway, apenas dígitos' })
  @Matches(/^(?:\d{11}|\d{14})$/)
  document: string

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1)
  password: string
}
