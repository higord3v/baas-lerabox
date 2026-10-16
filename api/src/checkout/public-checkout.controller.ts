import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../auth/authenticated-request.js'
import { Public } from '../auth/public.decorator.js'
import { CheckoutService } from './checkout.service.js'
import { CheckoutLinkResponseDto, PaymentResponseDto } from './dto/checkout-response.dto.js'
import { PayCardDto } from './dto/pay-card.dto.js'
import { PayPixDto } from './dto/pay-pix.dto.js'

@Public()
@ApiTags('public-checkout')
@Controller('checkout')
export class PublicCheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get(':id')
  @ApiOkResponse({ type: CheckoutLinkResponseDto })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<CheckoutLinkResponseDto> {
    return this.checkout.publicLink(id)
  }

  @Post(':id/pix')
  @ApiCreatedResponse({ type: PaymentResponseDto })
  pix(@Param('id', ParseUUIDPipe) id: string, @Body() input: PayPixDto, @Req() request: AuthenticatedRequest): Promise<PaymentResponseDto> {
    return this.checkout.payPix(id, input, request.correlationId)
  }

  @Post(':id/card')
  @ApiCreatedResponse({ type: PaymentResponseDto })
  card(@Param('id', ParseUUIDPipe) id: string, @Body() input: PayCardDto, @Req() request: AuthenticatedRequest): Promise<PaymentResponseDto> {
    return this.checkout.payCard(id, input, request.correlationId)
  }

  @Get(':id/orders/:orderId')
  @ApiOkResponse({ type: PaymentResponseDto })
  result(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaymentResponseDto> {
    return this.checkout.paymentResult(id, orderId, request.correlationId)
  }
}
