import { useEffect, useState } from 'react'
import { errorMessage } from '../api/client'
import { getStatement, type StatementEntry, type TransactionStatus, type TransactionType } from '../api/wallet'
import { TransactionList } from './transaction-list'

export function StatementPage({ token, updateVersion }: { token: string; updateVersion: number }) {
  const [status, setStatus] = useState<TransactionStatus | ''>('')
  const [type, setType] = useState<TransactionType | ''>('')
  const [items, setItems] = useState<StatementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getStatement(token, { status: status || undefined, type: type || undefined, limit: 50 }, controller.signal)
      .then((entries) => {
        if (controller.signal.aborted) return
        setItems(entries)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason, 'Falha ao carregar o extrato.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, status, type, refresh, updateVersion])

  function reload() {
    setLoading(true)
    setRefresh((value) => value + 1)
  }

  return (
    <section className="financial-page" aria-labelledby="statement-title">
      <div className="financial-page__heading">
        <div><span className="eyebrow">MOVIMENTAÇÕES</span><h1 id="statement-title">Extrato</h1><p>Consulte os pagamentos, saques e links encerrados da sua conta.</p></div>
        <button className="secondary-button" type="button" onClick={reload} disabled={loading}>Atualizar</button>
      </div>
      <div className="statement-card">
        <div className="statement-filters">
          <label className="form-field">Situação
            <select value={status} onChange={(event) => { setStatus(event.target.value as TransactionStatus | ''); setLoading(true) }}>
              <option value="">Todas</option>
              <option value="APPROVED">Sucesso</option>
              <option value="DENIED">Falha</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="PENDING">Pendente</option>
            </select>
          </label>
          <label className="form-field">Tipo
            <select value={type} onChange={(event) => { setType(event.target.value as TransactionType | ''); setLoading(true) }}>
              <option value="">Todos</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão</option>
              <option value="WITHDRAWAL">Saque</option>
            </select>
          </label>
        </div>
        {error && <p className="feedback feedback--error" role="alert">{error}</p>}
        {loading ? <p className="statement-empty">Carregando transações...</p> : <TransactionList items={items} emptyMessage="Nenhuma transação encontrada para estes filtros." />}
      </div>
    </section>
  )
}
