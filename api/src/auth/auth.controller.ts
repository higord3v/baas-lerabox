import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from './authenticated-request.js'
import { AuthService } from './auth.service.js'
import { AuthResponseDto, MerchantProfileDto, RegisterResponseDto } from './dto/auth-response.dto.js'
import { LocalLoginDto } from './dto/local-login.dto.js'
import { RegisterMerchantDto } from './dto/register-merchant.dto.js'
import { Public } from './public.decorator.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cadastra o lojista no BaaS e no gateway' })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  register(@Body() input: RegisterMerchantDto, @Req() request: AuthenticatedRequest): Promise<RegisterResponseDto> {
    return this.auth.register(input, request.correlationId)
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Inicia a sessão própria do lojista no BaaS' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  login(@Body() input: LocalLoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MerchantProfileDto })
  profile(@Req() request: AuthenticatedRequest): Promise<MerchantProfileDto> {
    return this.auth.profile(request.userId)
  }
}
