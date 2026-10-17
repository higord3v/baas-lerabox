import { useEffect, useState, type FormEvent } from 'react'
import { createCheckout, getFees, listCheckouts, type CardBrand, type CardFee, type CheckoutLink, type PaymentMethod } from '../api/checkout'
import { errorMessage } from '../api/client'

const brands: CardBrand[] = ['VISA', 'MASTERCARD', 'ELO']
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function CheckoutManager({ token }: { token: string }) {
  const [links, setLinks] = useState<CheckoutLink[]>([])
  const [method, setMethod] = useState<PaymentMethod>('PIX')
  const [brand, setBrand] = useState<CardBrand>('VISA')
  const [fees, setFees] = useState<CardFee[]>([])
  const [loadingFees, setLoadingFees] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    listCheckouts(token).then((value) => { if (active) setLinks(value) })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason, 'Falha ao carregar links.')) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (method !== 'CARD') return
    let active = true
    getFees(token, brand).then((value) => { if (active) setFees(value) })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason, 'Falha ao carregar taxas.')) })
      .finally(() => { if (active) setLoadingFees(false) })
    return () => { active = false }
  }, [token, brand, method])

  function chooseMethod(value: PaymentMethod) {
    setMethod(value)
    if (value === 'CARD') {
      setFees([])
      setLoadingFees(true)
    }
  }

  function chooseBrand(value: CardBrand) {
    setBrand(value)
    setFees([])
    setLoadingFees(true)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const amountCents = Number(data.get('amountCents'))
    if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
      setError('Informe um valor válido em centavos.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const link = await createCheckout(token, {
        amountCents,
        description: String(data.get('description') ?? '').trim() || undefined,
        method,
        ...(method === 'CARD' ? { cardBrand: brand, installments: Number(data.get('installments')) } : {}),
      })
      setLinks((current) => [link, ...current])
      setNotice('Link criado. Você já pode copiá-lo e enviar ao pagador.')
      form.reset()
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao criar link.'))
    } finally {
      setBusy(false)
    }
  }

  async function copyLink(link: CheckoutLink) {
    try {
      await navigator.clipboard.writeText(new URL(link.publicUrl, window.location.origin).toString())
      setNotice('Link copiado.')
    } catch {
      setError('Não foi possível copiar o link. Abra-o e copie o endereço do navegador.')
    }
  }

  async function refreshLinks() {
    setError('')
    try {
      setLinks(await listCheckouts(token))
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao atualizar links.'))
    }
  }

  return (
    <section className="checkout-manager" aria-label="Links de pagamento">
      <div className="checkout-manager__header">
        <div><span className="eyebrow">CHECKOUT</span><h2>Links de pagamento</h2></div>
        <p>Crie um link para compartilhar com seu cliente.</p>
      </div>
      {error && <p className="feedback feedback--error" role="alert">{error}</p>}
      {notice && <p className="feedback feedback--success" role="status">{notice}</p>}
      <div className="checkout-manager__grid">
        <form className="form checkout-manager__form" onSubmit={handleCreate}>
          <h3>Novo link</h3>
          <label className="form-field">Valor em centavos<input name="amountCents" type="number" min="1" max="2147483647" step="1" required placeholder="25000" /></label>
          <label className="form-field">Descrição<input name="description" maxLength={255} placeholder="Compra loja online" /></label>
          <label className="form-field">Forma de pagamento
            <select value={method} onChange={(event) => chooseMethod(event.target.value as PaymentMethod)}>
              <option value="PIX">Pix</option><option value="CARD">Cartão de crédito</option>
            </select>
          </label>
          {method === 'CARD' && <>
            <label className="form-field">Bandeira
              <select value={brand} onChange={(event) => chooseBrand(event.target.value as CardBrand)}>
                {brands.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="form-field">Parcelas
              <select name="installments" required disabled={loadingFees || fees.length === 0}>
                {fees.map((fee) => <option key={fee.installments} value={fee.installments}>{fee.installments}x · taxa {fee.feePercent}%</option>)}
              </select>
            </label>
            {loadingFees && <p className="form-help">Consultando taxas...</p>}
          </>}
          <button className="primary-button" disabled={busy || (method === 'CARD' && fees.length === 0)}>Criar link</button>
        </form>
        <div className="checkout-manager__list">
          <div className="checkout-manager__list-heading">
            <h3>Links criados</h3>
            <button type="button" onClick={() => void refreshLinks()}>Atualizar</button>
          </div>
          {links.length === 0 ? <p className="form-help">Nenhum link criado ainda.</p> : links.map((link) => (
            <article className="checkout-link" key={link.id}>
              <div><strong>{link.description || 'Pagamento'}</strong><span>{currency.format(link.amountCents / 100)} · {link.method === 'PIX' ? 'Pix' : `Cartão ${link.cardBrand} ${link.installments}x`}</span></div>
              <span className="checkout-link__status">{link.status}</span>
              <div className="checkout-link__actions">
                <a href={link.publicUrl} target="_blank" rel="noopener noreferrer">Abrir</a>
                <button type="button" onClick={() => void copyLink(link)}>Copiar link</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
