export function WalletPage() {
  return (
    <section className="future-page" aria-labelledby="wallet-title">
      <span className="eyebrow">VISÃO FINANCEIRA</span>
      <h1 id="wallet-title">Carteira</h1>
      <p className="future-page__description">Acompanhe seu saldo e gerencie os saques da sua conta.</p>
      <div className="future-card">
        <span className="future-card__label">Carteira</span>
        <h2>Saldo e saques</h2>
        <p>A consulta de saldo e a solicitação de saque estarão disponíveis aqui em breve.</p>
      </div>
    </section>
  )
}

export function StatementPage() {
  return (
    <section className="future-page" aria-labelledby="statement-title">
      <span className="eyebrow">MOVIMENTAÇÕES</span>
      <h1 id="statement-title">Extrato</h1>
      <p className="future-page__description">Consulte transações e acompanhe o histórico da sua conta.</p>
      <div className="future-card">
        <span className="future-card__label">Transações</span>
        <h2>Extrato da conta</h2>
        <p>A listagem de transações e os filtros estarão disponíveis aqui em breve.</p>
      </div>
    </section>
  )
}
