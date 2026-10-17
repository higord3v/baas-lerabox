import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { createWithdrawal, getWithdrawal, listWithdrawals, type Withdrawal } from '../api/withdrawals'
import { digitsOnly, maskDocument } from '../utils/input-masks'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function amountToCents(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/)
  if (!match) return null
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= 4294967295 ? amount : null
}

function statusLabel(status: string): string {
  return { PENDING: 'Pendente', APPROVED: 'Aprovado', DENIED: 'Recusado', CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado' }[status] ?? status
}

export function WithdrawalsPanel({ token, onChanged, updateVersion }: { token: string; onChanged: () => void; updateVersion: number }) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [document, setDocument] = useState('')
  const [description, setDescription] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [checkingId, setCheckingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listWithdrawals(token, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setWithdrawals(items) })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason, 'Falha ao carregar saques.'))
      })
    return () => controller.abort()
  }, [token, updateVersion])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountCents = amountToCents(amount)
    if (amountCents === null) {
      setError('Informe um valor válido em reais, com até duas casas decimais.')
      return
    }
    const ownerDocument = digitsOnly(document, 14)
    if (ownerDocument.length !== 11 && ownerDocument.length !== 14) {
      setError('Informe o CPF ou CNPJ do titular da chave Pix.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await createWithdrawal(token, {
        requestId, amountCents, pixKey: pixKey.trim(), document: ownerDocument,
        description: description.trim() || undefined,
      })
      setWithdrawals((items) => [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20))
      setNotice(`Saque solicitado. Situação: ${statusLabel(result.status)}.`)
      setAmount('')
      setPixKey('')
      setDocument('')
      setDescription('')
      setRequestId(crypto.randomUUID())
      onChanged()
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao solicitar saque. Reenvie a mesma solicitação para evitar duplicidade.'))
    } finally {
      setBusy(false)
    }
  }

  async function refreshStatus(id: string) {
    setCheckingId(id)
    setError('')
    try {
      const result = await getWithdrawal(token, id)
      setWithdrawals((items) => items.map((item) => item.id === id ? result : item))
      onChanged()
    } catch (reason) {
      setError(errorMessage(reason, 'Falha ao consultar o saque.'))
    } finally {
      setCheckingId('')
    }
  }

  return (
    <section className="withdrawals" aria-labelledby="withdrawals-title">
      <div className="statement-card__heading"><h2 id="withdrawals-title">Saques</h2><span>Envie para uma chave Pix de outra conta</span></div>
      {error && <p className="feedback feedback--error" role="alert">{error}</p>}
      {notice && <p className="feedback feedback--success" role="status">{notice}</p>}
      <div className="withdrawals__grid">
        <form className="form statement-card" onSubmit={submit}>
          <h3>Novo saque</h3>
          <label className="form-field">Valor (R$)
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required placeholder="100,00" />
          </label>
          <label className="form-field">Chave Pix de destino
            <input value={pixKey} onChange={(event) => setPixKey(event.target.value)} required maxLength={512} autoComplete="off" placeholder="E-mail, CPF, telefone ou chave aleatória" />
          </label>
          <label className="form-field">CPF ou CNPJ do titular
            <input value={document} onChange={(event) => {
              const digits = digitsOnly(event.target.value, 14)
              setDocument(maskDocument(digits, digits.length > 11 ? 'PJ' : 'PF'))
            }} inputMode="numeric" required placeholder="000.000.000-00" />
          </label>
          <label className="form-field">Descrição <span className="form-field__optional">(opcional)</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} placeholder="Saque para conta pessoal" />
          </label>
          <button className="primary-button" disabled={busy}>{busy ? 'Solicitando...' : 'Solicitar saque'}</button>
        </form>
        <div className="statement-card withdrawals__history">
          <h3>Solicitações recentes</h3>
          {withdrawals.length === 0 ? <p className="statement-empty">Nenhum saque solicitado ainda.</p> : withdrawals.map((item) => (
            <article className="withdrawals__item" key={item.id}>
              <div><strong>{currency.format(item.amountCents / 100)}</strong><span>{dateFormat.format(new Date(item.createdAt))}</span></div>
              <div className="withdrawals__status">
                <span className={`transaction-status transaction-status--${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                <button type="button" onClick={() => void refreshStatus(item.id)} disabled={checkingId === item.id}>
                  {checkingId === item.id ? 'Consultando...' : 'Consultar status'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
