import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Profile = { id: string; email: string; displayName: string }
type Session = { accessToken: string }
type GatewayStatus = { connected: boolean }

class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const body: unknown = await response.json()
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body ? body.message : null
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : 'Não foi possível concluir a solicitação.',
      response.status,
    )
  }
  return body as T
}

function value(form: FormData, name: string): string { return String(form.get(name) ?? '').trim() }

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [token, setToken] = useState(() => sessionStorage.getItem('baasSession') ?? '')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([api<Profile>('/auth/me', {}, token), api<GatewayStatus>('/gateway-account', {}, token)])
      .then(([merchant, account]) => {
        if (active) { setProfile(merchant); setConnected(account.connected) }
      }).catch((reason: unknown) => {
        if (!active) return
        if (reason instanceof ApiError && reason.status === 401) logout()
        else setError(reason instanceof Error ? reason.message : 'Falha ao carregar a conta.')
      })
    return () => { active = false }
  }, [token])

  function logout() {
    sessionStorage.removeItem('baasSession')
    setToken('')
    setProfile(null)
    setConnected(false)
    setNotice('')
    setError('')
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const input = {
      personType: value(form, 'personType'), name: value(form, 'name'),
      tradingName: value(form, 'tradingName') || undefined, email: value(form, 'email'),
      phone: value(form, 'phone'), document: value(form, 'document'), zipCode: value(form, 'zipCode'),
      address: value(form, 'address'), number: value(form, 'number'),
      complement: value(form, 'complement') || undefined, neighborhood: value(form, 'neighborhood'),
      city: value(form, 'city'), state: value(form, 'state').toUpperCase(),
      localPassword: String(form.get('localPassword') ?? ''),
    }
    try {
      const result = await api<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
      setNotice(result.message)
      setMode('login')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha no cadastro.')
    } finally { setBusy(false) }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await api<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: value(form, 'email'), password: String(form.get('password') ?? '') }),
      })
      sessionStorage.setItem('baasSession', result.accessToken)
      setToken(result.accessToken)
      setNotice('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha no login.')
    } finally { setBusy(false) }
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await api<GatewayStatus>('/gateway-account/login', {
        method: 'POST',
        body: JSON.stringify({ document: value(form, 'document'), password: String(form.get('password') ?? '') }),
      }, token)
      formElement.reset()
      setConnected(true)
      setNotice('Conta do gateway conectada com segurança.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao conectar o gateway.')
    } finally { setBusy(false) }
  }

  return <main className="page">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">LB</span><span>Lera Box <strong>BaaS</strong></span></div>
      {token && <button className="text-button" onClick={logout}>Sair</button>}
    </header>
    <section className="layout">
      <div className="intro">
        <span className="eyebrow">PLATAFORMA DO LOJISTA</span>
        <h1>Seus pagamentos começam com uma conta conectada.</h1>
        <p>Cadastre sua operação, acesse o BaaS e conecte as credenciais enviadas pelo gateway ao seu e-mail.</p>
        <div className="steps">
          <div><span>01</span><p>Crie sua conta e informe dados reais de contato.</p></div>
          <div><span>02</span><p>Entre com a senha local definida no cadastro.</p></div>
          <div><span>03</span><p>Conecte a conta do gateway com a senha recebida por e-mail.</p></div>
        </div>
      </div>
      <div className="panel">
        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}
        {token ? <>
          <div className="panel-heading"><span className="eyebrow">MINHA CONTA</span><h2>{profile ? `Olá, ${profile.displayName}` : 'Carregando conta...'}</h2><p>{profile?.email}</p></div>
          <div className={`status ${connected ? 'is-connected' : ''}`}><span className="status-dot" />{connected ? 'Gateway conectado' : 'Gateway ainda não conectado'}</div>
          {!connected && <form onSubmit={connect}>
            <h3>Conectar gateway</h3>
            <p className="form-help">Use o documento e a senha enviados por e-mail pelo Lera Box. A senha não é armazenada no BaaS.</p>
            <label>CPF ou CNPJ<input name="document" inputMode="numeric" pattern="[0-9]{11}|[0-9]{14}" required placeholder="Apenas números" /></label>
            <label>Senha do gateway<input name="password" type="password" required autoComplete="off" /></label>
            <button className="primary-button" disabled={busy}>Conectar conta</button>
          </form>}
        </> : <>
          <div className="tabs" role="tablist" aria-label="Acesso ao BaaS">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Entrar</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Criar conta</button>
          </div>
          {mode === 'login' ? <form onSubmit={login}>
            <div className="panel-heading"><h2>Bem-vindo de volta</h2><p>Entre com seu acesso do BaaS.</p></div>
            <label>E-mail<input name="email" type="email" required autoComplete="username" /></label>
            <label>Senha local<input name="password" type="password" required autoComplete="current-password" /></label>
            <button className="primary-button" disabled={busy}>Entrar na plataforma</button>
          </form> : <form onSubmit={register}>
            <div className="panel-heading"><h2>Abra sua conta</h2><p>O gateway enviará as credenciais para o e-mail informado.</p></div>
            <div className="form-grid">
              <label>Tipo de pessoa<select name="personType" required><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
              <label>Nome ou razão social<input name="name" required minLength={2} maxLength={120} /></label>
              <label>Nome fantasia <span>(opcional)</span><input name="tradingName" maxLength={120} /></label>
              <label>E-mail real<input name="email" type="email" required autoComplete="email" /></label>
              <label>Celular com DDD<input name="phone" inputMode="numeric" pattern="[0-9]{11}" required placeholder="11999998888" /></label>
              <label>CPF ou CNPJ<input name="document" inputMode="numeric" pattern="[0-9]{11}|[0-9]{14}" required placeholder="Apenas números" /></label>
              <label>CEP<input name="zipCode" inputMode="numeric" pattern="[0-9]{8}" required placeholder="01310100" /></label>
              <label>Endereço<input name="address" required /></label>
              <label>Número<input name="number" required /></label>
              <label>Complemento <span>(opcional)</span><input name="complement" /></label>
              <label>Bairro<input name="neighborhood" required /></label>
              <label>Cidade<input name="city" required /></label>
              <label>UF<input name="state" required maxLength={2} minLength={2} placeholder="SP" /></label>
              <label>Senha local<input name="localPassword" type="password" required minLength={12} autoComplete="new-password" /></label>
            </div>
            <button className="primary-button" disabled={busy}>Criar conta</button>
          </form>}
        </>}
      </div>
    </section>
  </main>
}

export default App
