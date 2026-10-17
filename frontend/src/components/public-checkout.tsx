import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { getPaymentResult, getPublicCheckout, payCard, payPix, type CheckoutLink, type PaymentResult } from '../api/checkout'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pagamento em processamento', APPROVED: 'Pagamento aprovado',
    DENIED: 'Pagamento recusado', EXPIRED: 'Pagamento expirado', CANCELLED: 'Pagamento cancelado',
  }
  return labels[status] ?? status
}

export function PublicCheckout({ id }: { id: string }) {
  const [link, setLink] = useState<CheckoutLink | null>(null)
  const [payment, setPayment] = useState<PaymentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const storageKey = `checkout-order:${id}`
  const attemptStorageKey = `checkout-attempt:${id}`
  const attemptKey = useRef(sessionStorage.getItem(attemptStorageKey) ?? crypto.randomUUID())

  useEffect(() => {
    let active = true
    const orderId = sessionStorage.getItem(storageKey)
    Promise.all([getPublicCheckout(id), orderId ? getPaymentResult(id, orderId) : Promise.resolve(null)])
      .then(([nextLink, nextPayment]) => {
        if (!active) return
        setLink(nextLink)
        setPayment(nextPayment)
      })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason, 'Não foi possível carregar o checkout.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, storageKey])

  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return
    const timer = window.setTimeout(() => {
      getPaymentResult(id, payment.orderId).then((result) => {
        setPayment(result)
        setError('')
      }).catch((reason: unknown) => {
        setError(errorMessage(reason, 'Não foi possível consultar o pagamento. Tente atualizar a página.'))
        setPayment((current) => current ? { ...current } : null)
      })
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [id, payment])

  async function submitPix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const document = String(new FormData(event.currentTarget).get('payerDocument') ?? '').replace(/\D/g, '')
    setBusy(true)
    setError('')
    try {
      sessionStorage.setItem(attemptStorageKey, attemptKey.current)
      const result = await payPix(id, document, attemptKey.current)
      sessionStorage.setItem(storageKey, result.orderId)
      setPayment(result)
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao gerar Pix.'))
    } finally {
      setBusy(false)
    }
  }

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    try {
      sessionStorage.setItem(attemptStorageKey, attemptKey.current)
      const result = await payCard(id, {
        cardNumber: String(data.get('cardNumber') ?? '').replace(/\D/g, ''),
        cardHolder: String(data.get('cardHolder') ?? '').trim(),
        expiryMonth: String(data.get('expiryMonth') ?? '').trim(),
        expiryYear: String(data.get('expiryYear') ?? '').trim(),
        cvv: String(data.get('cvv') ?? '').trim(),
        attemptKey: attemptKey.current,
      })
      form.reset()
      sessionStorage.setItem(storageKey, result.orderId)
      setPayment(result)
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao processar cartão.'))
    } finally {
      setBusy(false)
    }
  }

  function tryAgain() {
    sessionStorage.removeItem(storageKey)
    attemptKey.current = crypto.randomUUID()
    sessionStorage.setItem(attemptStorageKey, attemptKey.current)
    setPayment(null)
    setError('')
  }

  return <main className="payer-page">
    <div className="payer-card">
      <span className="eyebrow">LERABOX · CHECKOUT</span>
      {loading ? <p>Carregando checkout...</p> : <>
        {error && <p className="feedback feedback--error" role="alert">{error}</p>}
        {link && <>
          <h1>{link.description || 'Pagamento'}</h1>
          <p className="payer-card__amount">{currency.format(link.amountCents / 100)}</p>
          <p className="form-help">{link.method === 'PIX' ? 'Pagamento por Pix' : `Cartão de crédito · ${link.cardBrand} · ${link.installments}x · taxa ${link.feePercent}%`}</p>
          {payment ? <div className="payment-result" aria-live="polite">
            <h2>{statusLabel(payment.status)}</h2>
            {payment.status === 'PENDING' && <p>Consultando o gateway para confirmar o status...</p>}
            {payment.qrCodeBase64?.startsWith('data:image/png;base64,') && <img className="payment-result__qr" src={payment.qrCodeBase64} alt="QR Code para pagamento Pix" />}
            {payment.emv && <>
              <label className="form-field">Pix copia e cola<textarea readOnly value={payment.emv} rows={4} /></label>
              <button type="button" className="secondary-button" onClick={() => void navigator.clipboard.writeText(payment.emv ?? '')}>Copiar código Pix</button>
            </>}
            {payment.txid && <p className="form-help">Identificador Pix: {payment.txid}</p>}
            {['DENIED', 'EXPIRED', 'CANCELLED'].includes(payment.status) && link.status === 'ACTIVE' &&
              <button type="button" className="secondary-button" onClick={tryAgain}>Tentar novamente</button>}
          </div> : link.status !== 'ACTIVE' ? <p className="feedback feedback--error">Este link está {link.status.toLowerCase()}.</p> : link.method === 'PIX' ?
            <form className="form" onSubmit={submitPix}>
              <label className="form-field">CPF ou CNPJ do pagador<input name="payerDocument" inputMode="numeric" pattern="[0-9]{11}|[0-9]{14}" required placeholder="Apenas números" /></label>
              <button className="primary-button" disabled={busy}>Pagar Pix</button>
            </form> : <form className="form" onSubmit={submitCard} autoComplete="off">
              <label className="form-field">Número do cartão<input name="cardNumber" inputMode="numeric" pattern="[0-9 ]{13,23}" required /></label>
              <label className="form-field">Nome no cartão<input name="cardHolder" required maxLength={120} /></label>
              <div className="form-grid">
                <label className="form-field">Mês<input name="expiryMonth" inputMode="numeric" pattern="0[1-9]|1[0-2]" maxLength={2} placeholder="12" required /></label>
                <label className="form-field">Ano<input name="expiryYear" inputMode="numeric" pattern="20[0-9]{2}" maxLength={4} placeholder="2030" required /></label>
              </div>
              <label className="form-field">CVV<input name="cvv" type="password" inputMode="numeric" pattern="[0-9]{3,4}" maxLength={4} required /></label>
              <button className="primary-button" disabled={busy}>Pagar com cartão</button>
            </form>}
        </>}
      </>}
    </div>
  </main>
}
