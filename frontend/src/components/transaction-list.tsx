import type { StatementEntry, TransactionStatus, TransactionType } from '../api/wallet'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const statusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Sucesso',
  DENIED: 'Falha',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
}

const typeLabels: Record<TransactionType, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  WITHDRAWAL: 'Saque',
}

export function TransactionList({ items, emptyMessage }: { items: StatementEntry[]; emptyMessage: string }) {
  if (items.length === 0) return <p className="statement-empty">{emptyMessage}</p>

  return (
    <div className="transaction-list">
      {items.map((item) => (
        <article className="transaction-row" key={`${item.source}-${item.id}`}>
          <div className="transaction-row__main">
            <strong>{item.description || typeLabels[item.type]}</strong>
            <span>{typeLabels[item.type]} · {dateFormat.format(new Date(item.occurredAt))}</span>
            {item.externalReference && <span className="transaction-row__reference">Ref. {item.externalReference}</span>}
          </div>
          <div className="transaction-row__details">
            <strong>{item.type === 'WITHDRAWAL' ? '−' : ''}{currency.format(item.amountCents / 100)}</strong>
            <span className={`transaction-status transaction-status--${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
