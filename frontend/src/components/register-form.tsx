import type { FormEvent } from 'react'
import type { RegisterMerchantInput } from '../api/merchant'
import { FormField } from './form-field'

interface RegisterFormProps {
  busy: boolean
  onSubmit: (input: RegisterMerchantInput) => Promise<boolean>
}

function formValue(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim()
}

export function RegisterForm({ busy, onSubmit }: RegisterFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: RegisterMerchantInput = {
      personType: formValue(form, 'personType') as 'PF' | 'PJ',
      name: formValue(form, 'name'),
      tradingName: formValue(form, 'tradingName') || undefined,
      email: formValue(form, 'email'),
      phone: formValue(form, 'phone'),
      document: formValue(form, 'document'),
      zipCode: formValue(form, 'zipCode'),
      address: formValue(form, 'address'),
      number: formValue(form, 'number'),
      complement: formValue(form, 'complement') || undefined,
      neighborhood: formValue(form, 'neighborhood'),
      city: formValue(form, 'city'),
      state: formValue(form, 'state').toUpperCase(),
      localPassword: String(form.get('localPassword') ?? ''),
    }
    await onSubmit(input)
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h2>Abra sua conta</h2>
        <p>O gateway enviará as credenciais para o e-mail informado.</p>
      </div>
      <div className="form-grid">
        <label className="form-field" htmlFor="personType">
          <span className="form-field__label">Tipo de pessoa</span>
          <select id="personType" name="personType" required>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </select>
        </label>
        <FormField label="Nome ou razão social" name="name" required minLength={2} maxLength={120} />
        <FormField label="Nome fantasia" name="tradingName" optional maxLength={120} />
        <FormField label="E-mail real" name="email" type="email" required autoComplete="email" />
        <FormField label="Celular com DDD" name="phone" inputMode="numeric" pattern="[0-9]{11}" required placeholder="11999998888" />
        <FormField label="CPF ou CNPJ" name="document" inputMode="numeric" pattern="[0-9]{11}|[0-9]{14}" required placeholder="Apenas números" />
        <FormField label="CEP" name="zipCode" inputMode="numeric" pattern="[0-9]{8}" required placeholder="01310100" />
        <FormField label="Endereço" name="address" required />
        <FormField label="Número" name="number" required />
        <FormField label="Complemento" name="complement" optional />
        <FormField label="Bairro" name="neighborhood" required />
        <FormField label="Cidade" name="city" required />
        <FormField label="UF" name="state" required minLength={2} maxLength={2} placeholder="SP" />
        <FormField label="Senha local" name="localPassword" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <button className="primary-button" disabled={busy}>Criar conta</button>
    </form>
  )
}
