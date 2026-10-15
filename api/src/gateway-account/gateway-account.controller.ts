import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { ConnectGatewayAccountDto } from './dto/connect-gateway-account.dto.js'
import { GatewayAccountStatusDto } from './dto/gateway-account-status.dto.js'
import { GatewayAccountService } from './gateway-account.service.js'

@ApiTags('gateway-account')
@ApiBearerAuth()
@Controller('gateway-account')
export class GatewayAccountController {
  constructor(private readonly accounts: GatewayAccountService) {}

  @Post('login')
  @ApiOperation({ summary: 'Conecta a conta do gateway ao lojista autenticado' })
  @ApiCreatedResponse({ type: GatewayAccountStatusDto })
  connect(@Req() request: AuthenticatedRequest, @Body() input: ConnectGatewayAccountDto): Promise<GatewayAccountStatusDto> {
    return this.accounts.connect(request.userId, input, request.correlationId)
  }

  @Get()
  @ApiOkResponse({ type: GatewayAccountStatusDto })
  status(@Req() request: AuthenticatedRequest): Promise<GatewayAccountStatusDto> {
    return this.accounts.status(request.userId)
  }
}
