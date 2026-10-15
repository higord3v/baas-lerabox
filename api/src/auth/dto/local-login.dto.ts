import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString } from 'class-validator'

export class LocalLoginDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty({ writeOnly: true })
  @IsString()
  password: string
}
