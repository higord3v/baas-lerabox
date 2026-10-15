import { ApiProperty } from '@nestjs/swagger'

export class GatewayAccountStatusDto {
  @ApiProperty()
  connected: boolean
}
