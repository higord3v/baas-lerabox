import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator'

export class PayCardDto {
  @ApiProperty({ description: 'Número do cartão, apenas dígitos', writeOnly: true })
  @Matches(/^\d{13,19}$/)
  cardNumber: string

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cardHolder: string

  @ApiProperty({ example: '12', writeOnly: true })
  @Matches(/^(0[1-9]|1[0-2])$/)
  expiryMonth: string

  @ApiProperty({ example: '2030', writeOnly: true })
  @Matches(/^20\d{2}$/)
  expiryYear: string

  @ApiProperty({ writeOnly: true })
  @Matches(/^\d{3,4}$/)
  cvv: string

  @ApiProperty({ description: 'UUID da tentativa para evitar cobranças repetidas' })
  @IsUUID()
  attemptKey: string
}
