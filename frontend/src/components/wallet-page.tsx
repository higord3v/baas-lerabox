import { useEffect, useState } from 'react'
import { errorMessage } from '../api/client'
import { getStatement, getWallet, type StatementEntry } from '../api/wallet'
import { TransactionList } from './transaction-list'
import { WithdrawalsPanel } from './withdrawals-panel'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function WalletPage({ token, updateVersion }: { token: string; updateVersion: number }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<StatementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getWallet(token, controller.signal), getStatement(token, { limit: 5 }, controller.signal)])
      .then(([wallet, items]) => {
        if (controller.signal.aborted) return
        setBalance(wallet.balanceCents)
        setTransactions(items)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason, 'Falha ao carregar a carteira.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, refresh, updateVersion])

  function reload() {
    setLoading(true)
    setRefresh((value) => value + 1)
  }

  return (
    <section className="financial-page" aria-labelledby="wallet-title">
      <div className="financial-page__heading">
        <div><span className="eyebrow">VISÃO FINANCEIRA</span><h1 id="wallet-title">Carteira</h1><p>Seu saldo e as movimentações mais recentes.</p></div>
        <button className="secondary-button" type="button" onClick={reload} disabled={loading}>Atualizar</button>
      </div>
      {error && <p className="feedback feedback--error" role="alert">{error}</p>}
      <div className="balance-card">
        <span>Saldo disponível</span>
        <strong>{balance === null ? '—' : currency.format(balance / 100)}</strong>
        <small>{loading ? 'Atualizando carteira...' : 'Saldo informado pelo gateway'}</small>
      </div>
      <WithdrawalsPanel token={token} onChanged={reload} updateVersion={updateVersion} />
      <div className="statement-card">
        <div className="statement-card__heading"><h2>Movimentações recentes</h2><span>Últimas 5</span></div>
        {loading && balance === null ? <p className="statement-empty">Carregando movimentações...</p> : <TransactionList items={transactions} emptyMessage="Nenhuma movimentação recente." />}
      </div>
    </section>
  )
}
