import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

export enum TransactionStatusFilter {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionTypeFilter {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  WITHDRAWAL = 'WITHDRAWAL',
}

export class TransactionsQueryDto {
  @ApiPropertyOptional({ enum: TransactionStatusFilter })
  @IsOptional()
  @IsEnum(TransactionStatusFilter)
  status?: TransactionStatusFilter

  @ApiPropertyOptional({ enum: TransactionTypeFilter })
  @IsOptional()
  @IsEnum(TransactionTypeFilter)
  type?: TransactionTypeFilter

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) => value === undefined ? 50 : Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50
}
