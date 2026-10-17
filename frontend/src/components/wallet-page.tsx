import { useEffect, useState } from 'react'
import { errorMessage } from '../api/client'
import { getWallet } from '../api/wallet'
import { WithdrawalsPanel } from './withdrawals-panel'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function WalletPage({ token, updateVersion }: { token: string; updateVersion: number }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getWallet(token, controller.signal)
      .then((wallet) => {
        if (controller.signal.aborted) return
        setBalance(wallet.balanceCents)
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
        <div><span className="eyebrow">VISÃO FINANCEIRA</span><h1 id="wallet-title">Carteira</h1><p>Consulte seu saldo e solicite saques.</p></div>
        <button className="secondary-button" type="button" onClick={reload} disabled={loading}>Atualizar</button>
      </div>
      {error && <p className="feedback feedback--error" role="alert">{error}</p>}
      <div className="balance-card">
        <span>Saldo disponível</span>
        <strong>{balance === null ? '—' : currency.format(balance / 100)}</strong>
        <small>{loading ? 'Atualizando carteira...' : 'Saldo informado pelo gateway'}</small>
      </div>
      <WithdrawalsPanel token={token} onChanged={reload} updateVersion={updateVersion} />
    </section>
  )
}
