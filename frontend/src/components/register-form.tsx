import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getAddressByZipCode } from '../api/address'
import { errorMessage } from '../api/client'
import type { RegisterMerchantInput } from '../api/merchant'
import { digitsOnly, maskDocument, maskPhone, maskZipCode } from '../utils/input-masks'
import { FormField } from './form-field'

interface RegisterFormProps {
  busy: boolean
  onSubmit: (input: RegisterMerchantInput) => Promise<boolean>
}

function formValue(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim()
}

const phonePattern = '\\([0-9]{2}\\) [0-9]{5}-[0-9]{4}'
const cpfPattern = '[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}'
const cnpjPattern = '[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}/[0-9]{4}-[0-9]{2}'

export function RegisterForm({ busy, onSubmit }: RegisterFormProps) {
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [withoutNumber, setWithoutNumber] = useState(false)
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [addressNotice, setAddressNotice] = useState('')
  const addressRequest = useRef<AbortController | null>(null)

  useEffect(() => () => addressRequest.current?.abort(), [])

  function changeZipCode(value: string) {
    const next = maskZipCode(value)
    const digits = digitsOnly(next, 8)
    if (digits === digitsOnly(zipCode, 8)) return
    addressRequest.current?.abort()
    setZipCode(next)
    setAddress('')
    setNeighborhood('')
    setCity('')
    setState('')
    setLoadingAddress(false)
    setAddressError('')
    setAddressNotice('')
    if (digits.length === 8) void lookupAddress(digits)
  }

  async function lookupAddress(digits: string) {
    addressRequest.current?.abort()
    const controller = new AbortController()
    addressRequest.current = controller
    setLoadingAddress(true)
    setAddressError('')
    setAddressNotice('')

    try {
      const result = await getAddressByZipCode(digits, controller.signal)
      if (controller.signal.aborted) return
      setAddress(result.address)
      setNeighborhood(result.neighborhood)
      setCity(result.city)
      setState(result.state)
      setAddressNotice('Endereço encontrado. Confira os dados e informe o número.')
    } catch (reason) {
      if (controller.signal.aborted) return
      setAddressError(errorMessage(reason, 'Não foi possível consultar o CEP. Preencha o endereço manualmente.'))
    } finally {
      if (!controller.signal.aborted) setLoadingAddress(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: RegisterMerchantInput = {
      personType,
      name: formValue(form, 'name'),
      tradingName: formValue(form, 'tradingName') || undefined,
      email: formValue(form, 'email'),
      phone: digitsOnly(phone, 11),
      document: digitsOnly(document, personType === 'PF' ? 11 : 14),
      zipCode: digitsOnly(zipCode, 8),
      address: address.trim(),
      number: withoutNumber ? 'S/N' : number,
      complement: formValue(form, 'complement') || undefined,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
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
          <select id="personType" name="personType" value={personType} onChange={(event) => {
            const next = event.target.value as 'PF' | 'PJ'
            setPersonType(next)
            setDocument('')
          }} required>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </select>
        </label>
        <FormField label="Nome ou razão social" name="name" required minLength={2} maxLength={120} />
        <FormField label="Nome fantasia" name="tradingName" optional maxLength={120} />
        <FormField label="E-mail real" name="email" type="email" required autoComplete="email" />
        <FormField label="Celular com DDD" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
          value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))}
          pattern={phonePattern} maxLength={15} required placeholder="(11) 99999-8888" />
        <FormField label={personType === 'PF' ? 'CPF' : 'CNPJ'} name="document" inputMode="numeric"
          value={document} onChange={(event) => setDocument(maskDocument(event.target.value, personType))}
          pattern={personType === 'PF' ? cpfPattern : cnpjPattern}
          maxLength={personType === 'PF' ? 14 : 18} required
          placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} />
        <div className="zip-code-field">
          <FormField label="CEP" name="zipCode" inputMode="numeric" autoComplete="postal-code" value={zipCode}
            onChange={(event) => changeZipCode(event.target.value)}
            pattern="[0-9]{5}-[0-9]{3}" maxLength={9} required placeholder="01310-100" />
          {loadingAddress && <span className="zip-code-field__message" role="status">Buscando endereço...</span>}
          {addressError && <span className="zip-code-field__message zip-code-field__message--error" role="alert">{addressError}</span>}
          {addressNotice && <span className="zip-code-field__message" role="status">{addressNotice}</span>}
        </div>
        <FormField label="Endereço" name="address" value={address} onChange={(event) => setAddress(event.target.value)} required />
        <div className="address-number-field">
          <FormField label="Número" name="number" inputMode="numeric" maxLength={30} required placeholder="123"
            value={withoutNumber ? 'S/N' : number} readOnly={withoutNumber}
            pattern={withoutNumber ? 'S/N' : '[0-9]+'}
            onChange={(event) => setNumber(digitsOnly(event.target.value, 30))} />
          <label className="address-number-field__checkbox">
            <input type="checkbox" checked={withoutNumber} onChange={(event) => setWithoutNumber(event.target.checked)} />
            Sem número
          </label>
        </div>
        <FormField label="Complemento" name="complement" optional />
        <FormField label="Bairro" name="neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required />
        <FormField label="Cidade" name="city" value={city} onChange={(event) => setCity(event.target.value)} required />
        <FormField label="UF" name="state" value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} required minLength={2} maxLength={2} placeholder="SP" />
        <FormField label="Senha local" name="localPassword" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <button className="primary-button" disabled={busy || loadingAddress}>Criar conta</button>
    </form>
  )
}
