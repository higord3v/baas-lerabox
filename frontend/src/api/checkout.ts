import { apiRequest } from './client'

export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO'
export type PaymentMethod = 'PIX' | 'CARD'

export interface CheckoutLink {
  id: string
  publicUrl: string
  amountCents: number
  description: string | null
  method: PaymentMethod
  status: string
  cardBrand: CardBrand | null
  installments: number | null
  feePercent: string | null
  expiresAt: string | null
}

export interface CardFee {
  brand: CardBrand
  installments: number
  feePercent: number
}

export interface PaymentResult {
  orderId: string
  status: string
  emv: string | null
  qrCodeBase64: string | null
  txid: string | null
}

export interface CreateCheckoutInput {
  amountCents: number
  description?: string
  method: PaymentMethod
  cardBrand?: CardBrand
  installments?: number
}

export function listCheckouts(token: string): Promise<CheckoutLink[]> {
  return apiRequest('/checkout-links', {}, token)
}

export function createCheckout(token: string, input: CreateCheckoutInput): Promise<CheckoutLink> {
  return apiRequest('/checkout-links', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function getFees(token: string, brand: CardBrand): Promise<CardFee[]> {
  return apiRequest(`/checkout-links/fees?brand=${brand}`, {}, token)
}

export function getPublicCheckout(id: string): Promise<CheckoutLink> {
  return apiRequest(`/checkout/${encodeURIComponent(id)}`)
}

export function payPix(id: string, payerDocument: string, attemptKey: string): Promise<PaymentResult> {
  return apiRequest(`/checkout/${encodeURIComponent(id)}/pix`, {
    method: 'POST', body: JSON.stringify({ payerDocument, attemptKey }),
  })
}

export interface CardPaymentInput {
  cardNumber: string
  cardHolder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  attemptKey: string
}

export function payCard(id: string, input: CardPaymentInput): Promise<PaymentResult> {
  return apiRequest(`/checkout/${encodeURIComponent(id)}/card`, {
    method: 'POST', body: JSON.stringify(input),
  })
}

export function getPaymentResult(id: string, orderId: string): Promise<PaymentResult> {
  return apiRequest(`/checkout/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}`)
}
