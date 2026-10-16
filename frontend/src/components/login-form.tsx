import type { FormEvent } from 'react'
import type { LocalCredentials } from '../api/merchant'
import { FormField } from './form-field'

interface LoginFormProps {
  busy: boolean
  onSubmit: (input: LocalCredentials) => Promise<void | boolean>
}

export function LoginForm({ busy, onSubmit }: LoginFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void onSubmit({
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h2>Bem-vindo de volta</h2>
        <p>Entre com seu acesso do BaaS.</p>
      </div>
      <FormField label="E-mail" name="email" type="email" required autoComplete="username" />
      <FormField label="Senha local" name="password" type="password" required autoComplete="current-password" />
      <button className="primary-button" disabled={busy}>Entrar na plataforma</button>
    </form>
  )
}
