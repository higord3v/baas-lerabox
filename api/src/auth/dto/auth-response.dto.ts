import { ApiProperty } from '@nestjs/swagger'

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string

  @ApiProperty()
  tokenType: 'Bearer'
}

export class RegisterResponseDto {
  @ApiProperty()
  message: string
}

export class MerchantProfileDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  email: string

  @ApiProperty()
  displayName: string
}
