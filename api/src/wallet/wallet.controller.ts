import { Controller, Get, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { TransactionsQueryDto } from './dto/transactions-query.dto.js'
import { StatementResponseDto, WalletResponseDto } from './dto/wallet-response.dto.js'
import { WalletService } from './wallet.service.js'

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Consulta o saldo da carteira do lojista' })
  @ApiOkResponse({ type: WalletResponseDto })
  balance(@Req() request: AuthenticatedRequest): Promise<WalletResponseDto> {
    return this.wallet.balance(request.userId, request.correlationId)
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lista o extrato consolidado do lojista' })
  @ApiOkResponse({ type: StatementResponseDto })
  transactions(@Req() request: AuthenticatedRequest, @Query() query: TransactionsQueryDto): Promise<StatementResponseDto> {
    return this.wallet.transactions(request.userId, query, request.correlationId)
  }
}
