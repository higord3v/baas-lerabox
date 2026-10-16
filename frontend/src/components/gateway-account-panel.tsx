import type { FormEvent } from 'react'
import type { GatewayCredentials, MerchantProfile } from '../api/merchant'
import { FormField } from './form-field'

interface GatewayAccountPanelProps {
  profile: MerchantProfile | null
  connected: boolean
  loading: boolean
  busy: boolean
  onConnect: (input: GatewayCredentials) => Promise<boolean>
}

export function GatewayAccountPanel({ profile, connected, loading, busy, onConnect }: GatewayAccountPanelProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const succeeded = await onConnect({
      document: String(form.get('document') ?? '').trim(),
      password: String(form.get('gatewayPassword') ?? ''),
    })
    if (succeeded) formElement.reset()
  }

  return (
    <div className="account-panel">
      <div className="panel-heading">
        <span className="eyebrow">MINHA CONTA</span>
        <h2>{profile ? `Olá, ${profile.displayName}` : 'Carregando conta...'}</h2>
        {profile && <p>{profile.email}</p>}
      </div>
      {!loading && (
        <>
          <div className={`account-status ${connected ? 'account-status--connected' : ''}`}>
            <span className="account-status__dot" aria-hidden="true" />
            {connected ? 'Gateway conectado' : 'Gateway ainda não conectado'}
          </div>
          {!connected && (
            <form className="form" onSubmit={handleSubmit} autoComplete="off">
              <h3>Conectar gateway</h3>
              <p className="form-help">Use o documento e a senha enviados por e-mail pelo Lera Box. Essa senha é diferente da senha local do BaaS.</p>
              <FormField label="CPF ou CNPJ" name="document" inputMode="numeric" pattern="[0-9]{11}|[0-9]{14}" required placeholder="Apenas números" autoComplete="off" />
              <FormField label="Senha do gateway" name="gatewayPassword" type="password" required autoComplete="off" />
              <button className="primary-button" disabled={busy}>Conectar conta</button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
