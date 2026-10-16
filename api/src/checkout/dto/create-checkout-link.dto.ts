import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateCheckoutLinkDto {
  @ApiProperty({ description: 'Valor em centavos', minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCents: number

  @ApiProperty({ enum: ['PIX', 'CARD'] })
  @IsIn(['PIX', 'CARD'])
  method: 'PIX' | 'CARD'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @ApiPropertyOptional({ enum: ['VISA', 'MASTERCARD', 'ELO'] })
  @IsOptional()
  @IsIn(['VISA', 'MASTERCARD', 'ELO'])
  cardBrand?: 'VISA' | 'MASTERCARD' | 'ELO'

  @ApiPropertyOptional({ minimum: 1, maximum: 21 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  installments?: number

  @ApiPropertyOptional({ description: 'Data ISO futura' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
