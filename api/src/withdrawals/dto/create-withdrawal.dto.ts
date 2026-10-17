import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator'

export class CreateWithdrawalDto {
  @ApiProperty({ format: 'uuid', description: 'Identificador da tentativa para evitar saques duplicados' })
  @IsUUID()
  requestId: string

  @ApiProperty({ example: 10000, description: 'Valor em centavos' })
  @IsInt()
  @Min(1)
  @Max(4294967295)
  amountCents: number

  @ApiProperty({ example: 'titular@example.com', description: 'Chave Pix de destino' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  pixKey: string

  @ApiProperty({ example: '12345678901', description: 'CPF ou CNPJ do titular da chave Pix, apenas números' })
  @Matches(/^(\d{11}|\d{14})$/)
  document: string

  @ApiPropertyOptional({ example: 'Saque para conta pessoal' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string
}
