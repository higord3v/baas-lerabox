import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js'
import { WithdrawalResponseDto } from './dto/withdrawal-response.dto.js'
import { WithdrawalsService } from './withdrawals.service.js'

@ApiTags('withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Solicita um saque para uma chave Pix' })
  @ApiCreatedResponse({ type: WithdrawalResponseDto })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateWithdrawalDto): Promise<WithdrawalResponseDto> {
    return this.withdrawals.create(request.userId, input, request.correlationId)
  }

  @Get()
  @ApiOperation({ summary: 'Lista os últimos saques do lojista' })
  @ApiOkResponse({ type: WithdrawalResponseDto, isArray: true })
  list(@Req() request: AuthenticatedRequest): Promise<WithdrawalResponseDto[]> {
    return this.withdrawals.list(request.userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta o status atual de um saque próprio' })
  @ApiOkResponse({ type: WithdrawalResponseDto })
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<WithdrawalResponseDto> {
    return this.withdrawals.detail(request.userId, id, request.correlationId)
  }
}
