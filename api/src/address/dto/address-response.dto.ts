import { ApiProperty } from '@nestjs/swagger'

export class AddressResponseDto {
  @ApiProperty()
  zipCode: string

  @ApiProperty()
  address: string

  @ApiProperty()
  neighborhood: string

  @ApiProperty()
  city: string

  @ApiProperty()
  state: string
}
