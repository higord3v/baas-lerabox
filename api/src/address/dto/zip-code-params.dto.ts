import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

export class ZipCodeParamsDto {
  @ApiProperty({ example: '01001000', description: 'CEP com oito dígitos' })
  @Matches(/^\d{8}$/)
  zipCode: string
}
