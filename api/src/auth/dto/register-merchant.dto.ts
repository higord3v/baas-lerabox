import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class RegisterMerchantDto {
  @ApiProperty({ enum: ['PF', 'PJ'] })
  @IsIn(['PF', 'PJ'])
  personType: 'PF' | 'PJ'

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tradingName?: string

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string

  @ApiProperty({ description: 'Celular com DDD, apenas 11 dígitos' })
  @Matches(/^\d{11}$/)
  phone: string

  @ApiProperty({ description: 'CPF ou CNPJ, apenas dígitos' })
  @Matches(/^(?:\d{11}|\d{14})$/)
  document: string

  @ApiProperty({ description: 'CEP, apenas 8 dígitos' })
  @Matches(/^\d{8}$/)
  zipCode: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  address: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  number: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  neighborhood: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city: string

  @ApiProperty({ example: 'SP' })
  @Matches(/^[A-Z]{2}$/)
  state: string

  @ApiProperty({ writeOnly: true, minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  localPassword: string
}
