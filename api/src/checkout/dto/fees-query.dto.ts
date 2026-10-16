import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'
import type { CardBrand } from '../../gateway/gateway-http.service.js'

export class FeesQueryDto {
  @ApiProperty({ enum: ['VISA', 'MASTERCARD', 'ELO'] })
  @IsIn(['VISA', 'MASTERCARD', 'ELO'])
  brand: CardBrand
}
