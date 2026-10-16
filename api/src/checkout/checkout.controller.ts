import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { CheckoutService } from './checkout.service.js'
import { CardFeeDto, CheckoutLinkResponseDto } from './dto/checkout-response.dto.js'
import { CreateCheckoutLinkDto } from './dto/create-checkout-link.dto.js'
import { FeesQueryDto } from './dto/fees-query.dto.js'

@ApiTags('checkout-links')
@ApiBearerAuth()
@Controller('checkout-links')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  @ApiCreatedResponse({ type: CheckoutLinkResponseDto })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateCheckoutLinkDto): Promise<CheckoutLinkResponseDto> {
    return this.checkout.createLink(request.userId, input, request.correlationId)
  }

  @Get()
  @ApiOkResponse({ type: CheckoutLinkResponseDto, isArray: true })
  list(@Req() request: AuthenticatedRequest): Promise<CheckoutLinkResponseDto[]> {
    return this.checkout.listLinks(request.userId)
  }

  @Get('fees')
  @ApiOkResponse({ type: CardFeeDto, isArray: true })
  fees(@Req() request: AuthenticatedRequest, @Query() query: FeesQueryDto): Promise<CardFeeDto[]> {
    return this.checkout.fees(query.brand, request.correlationId)
  }

  @Get(':id')
  @ApiOkResponse({ type: CheckoutLinkResponseDto })
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<CheckoutLinkResponseDto> {
    return this.checkout.ownedLink(id, request.userId)
  }
}
