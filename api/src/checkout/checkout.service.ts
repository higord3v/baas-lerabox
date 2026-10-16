import { BadGatewayException, BadRequestException, ConflictException, GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { CheckoutLink } from '../database/entities/checkout-link.entity.js'
import { Order } from '../database/entities/order.entity.js'
import { GatewayAccountService } from '../gateway-account/gateway-account.service.js'
import { CardBrand, GatewayHttpService, GatewayPayment } from '../gateway/gateway-http.service.js'
import { CHECKOUT_REPOSITORY, type CheckoutRepositoryPort } from './checkout-repository.interface.js'
import { CardFeeDto, CheckoutLinkResponseDto, PaymentResponseDto } from './dto/checkout-response.dto.js'
import { CreateCheckoutLinkDto } from './dto/create-checkout-link.dto.js'
import { PayCardDto } from './dto/pay-card.dto.js'
import { PayPixDto } from './dto/pay-pix.dto.js'

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(CHECKOUT_REPOSITORY) private readonly repository: CheckoutRepositoryPort,
    private readonly gateway: GatewayHttpService,
    private readonly accounts: GatewayAccountService,
  ) {}

  async fees(brand: CardBrand, correlationId: string): Promise<CardFeeDto[]> {
    return this.gateway.getFees(brand, correlationId)
  }

  async createLink(userId: string, input: CreateCheckoutLinkDto, correlationId: string): Promise<CheckoutLinkResponseDto> {
    await this.accounts.accessTokenForUser(userId)
    if (input.method === 'CARD' && (!input.cardBrand || !input.installments)) {
      throw new BadRequestException('Bandeira e parcelas são obrigatórias para cartão')
    }
    if (input.method === 'PIX' && (input.cardBrand || input.installments)) {
      throw new BadRequestException('Pix não aceita bandeira ou parcelas')
    }
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('A expiração deve ser futura')

    let feePercent: string | null = null
    if (input.cardBrand && input.installments) {
      const fee = (await this.gateway.getFees(input.cardBrand, correlationId))
        .find((item) => item.installments === input.installments)
      if (!fee) throw new BadRequestException('Parcelas indisponíveis para esta bandeira')
      feePercent = fee.feePercent.toString()
    }

    const link = new CheckoutLink()
    link.id = randomUUID()
    link.userId = userId
    link.externalReference = `LINK-${link.id}`
    link.amountCents = input.amountCents
    link.description = input.description?.trim() || null
    link.method = input.method
    link.status = 'ACTIVE'
    link.cardBrand = input.cardBrand ?? null
    link.installments = input.installments ?? null
    link.feePercent = feePercent
    link.expiresAt = expiresAt
    return toLinkResponse(await this.repository.saveLink(link))
  }

  async listLinks(userId: string): Promise<CheckoutLinkResponseDto[]> {
    return (await this.repository.findOwnedLinks(userId)).map(toLinkResponse)
  }

  async ownedLink(id: string, userId: string): Promise<CheckoutLinkResponseDto> {
    const link = await this.repository.findOwnedLink(id, userId)
    if (!link) throw new NotFoundException('Link não encontrado')
    return toLinkResponse(link)
  }

  async publicLink(id: string): Promise<CheckoutLinkResponseDto> {
    return toLinkResponse(await this.requireLink(id))
  }

  async payPix(id: string, input: PayPixDto, correlationId: string): Promise<PaymentResponseDto> {
    const existing = await this.repository.findAttempt(id, input.attemptKey)
    if (existing) return this.paymentResult(id, existing.id, correlationId)
    const link = await this.requirePayableLink(id, 'PIX')
    const token = await this.accounts.accessTokenForUser(link.userId)
    const attempt = await this.repository.createAttempt(id, input.attemptKey)
    if (!attempt.created) return toPaymentResponse(attempt.order)

    let payment: GatewayPayment
    try {
      payment = await this.gateway.createPix({
        amount: link.amountCents,
        description: link.description ?? undefined,
        payerDocument: input.payerDocument,
        externalReference: attempt.order.externalReference,
      }, token, correlationId)
    } catch (error) {
      if (error instanceof BadRequestException) await this.repository.removeRejectedAttempt(attempt.order.id)
      throw error
    }
    await this.recordGatewayPayment(attempt.order, payment)
    await this.verifyPayment(attempt.order, token, correlationId)
    return toPaymentResponse((await this.repository.findOrder(id, attempt.order.id)) ?? attempt.order)
  }

  async payCard(id: string, input: PayCardDto, correlationId: string): Promise<PaymentResponseDto> {
    const existing = await this.repository.findAttempt(id, input.attemptKey)
    if (existing) return this.paymentResult(id, existing.id, correlationId)
    const link = await this.requirePayableLink(id, 'CARD')
    const token = await this.accounts.accessTokenForUser(link.userId)
    if (!link.cardBrand || !link.installments || !link.feePercent) throw new ConflictException('Plano de cartão inválido')
    const currentFee = (await this.gateway.getFees(link.cardBrand as CardBrand, correlationId))
      .find((item) => item.installments === link.installments)
    if (!currentFee || currentFee.feePercent !== Number(link.feePercent)) {
      throw new ConflictException('A taxa mudou; crie um novo link para revisar o valor')
    }
    const attempt = await this.repository.createAttempt(id, input.attemptKey)
    if (!attempt.created) return toPaymentResponse(attempt.order)

    let payment: GatewayPayment
    try {
      payment = await this.gateway.createCardPayment({
        amount: link.amountCents,
        description: link.description ?? undefined,
        externalReference: attempt.order.externalReference,
        cardNumber: input.cardNumber,
        cardHolder: input.cardHolder,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvv: input.cvv,
        installments: link.installments,
        feePercent: currentFee.feePercent,
      }, token, correlationId)
    } catch (error) {
      if (error instanceof BadRequestException) await this.repository.removeRejectedAttempt(attempt.order.id)
      throw error
    }
    await this.recordGatewayPayment(attempt.order, payment)
    await this.verifyPayment(attempt.order, token, correlationId)
    return toPaymentResponse((await this.repository.findOrder(id, attempt.order.id)) ?? attempt.order)
  }

  async paymentResult(linkId: string, orderId: string, correlationId: string): Promise<PaymentResponseDto> {
    const order = await this.repository.findOrder(linkId, orderId)
    if (!order) throw new NotFoundException('Pagamento não encontrado')
    if (order.status === 'PENDING' && order.gatewayPaymentId) {
      const token = await this.accounts.accessTokenForUser(order.userId)
      await this.verifyPayment(order, token, correlationId)
    }
    return toPaymentResponse((await this.repository.findOrder(linkId, orderId)) ?? order)
  }

  private async requireLink(id: string): Promise<CheckoutLink> {
    const link = await this.repository.findLink(id)
    if (!link) throw new NotFoundException('Link não encontrado')
    return link
  }

  private async requirePayableLink(id: string, method: CheckoutLink['method']): Promise<CheckoutLink> {
    const link = await this.requireLink(id)
    if (link.method !== method || link.status !== 'ACTIVE') throw new ConflictException('Link indisponível')
    if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('Link expirado')
    return link
  }

  private async recordGatewayPayment(order: Order, payment: GatewayPayment): Promise<void> {
    if (payment.amount !== order.amountCents || payment.externalReference !== order.externalReference) {
      throw new BadGatewayException('Pagamento divergente do pedido')
    }
    order.gatewayPaymentId = payment.id
    order.pixEmv = payment.emv
    order.pixQrCodeBase64 = payment.qrCodeBase64
    order.pixTxid = payment.txid
    await this.repository.saveOrder(order)
  }

  private async verifyPayment(order: Order, token: string, correlationId: string): Promise<void> {
    if (!order.gatewayPaymentId) return
    try {
      const payment = await this.gateway.getPayment(order.gatewayPaymentId, token, correlationId)
      if (payment.id !== order.gatewayPaymentId
        || (payment.amount !== null && payment.amount !== order.amountCents)
        || (payment.externalReference !== null && payment.externalReference !== order.externalReference)) {
        throw new BadGatewayException('Consulta de pagamento divergente')
      }
      if (isFinalStatus(payment.status)) await this.repository.confirmPayment(order.id, payment.status)
    } catch (error) {
      if (error instanceof BadGatewayException) throw error
    }
  }
}

function isFinalStatus(status: string): status is Order['status'] {
  return status === 'APPROVED' || status === 'DENIED' || status === 'EXPIRED' || status === 'CANCELLED'
}

function toLinkResponse(link: CheckoutLink): CheckoutLinkResponseDto {
  return {
    id: link.id,
    publicUrl: `/checkout/${link.id}`,
    amountCents: link.amountCents,
    description: link.description,
    method: link.method,
    status: link.status === 'ACTIVE' && link.expiresAt && link.expiresAt <= new Date() ? 'EXPIRED' : link.status,
    cardBrand: link.cardBrand,
    installments: link.installments,
    feePercent: link.feePercent,
    expiresAt: link.expiresAt,
  }
}

function toPaymentResponse(order: Order): PaymentResponseDto {
  return {
    orderId: order.id,
    status: order.status,
    emv: order.pixEmv,
    qrCodeBase64: order.pixQrCodeBase64,
    txid: order.pixTxid,
  }
}
