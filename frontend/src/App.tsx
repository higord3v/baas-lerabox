import { useState } from 'react'
import { Feedback } from './components/feedback'
import { GatewayAccountPanel } from './components/gateway-account-panel'
import { IntroSection } from './components/intro-section'
import { LoginForm } from './components/login-form'
import { RegisterForm } from './components/register-form'
import { SiteHeader } from './components/site-header'
import { useMerchantAccount } from './hooks/use-merchant-account'
import './App.css'

type AuthMode = 'login' | 'register'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const account = useMerchantAccount()

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    account.clearError()
  }

  return (
    <main className="page">
      <SiteHeader signedIn={Boolean(account.token)} onSignOut={account.signOut} />
      <div className="layout">
        <IntroSection />
        <section className="panel" aria-label="Acesso do lojista">
          <Feedback error={account.error} notice={account.notice} />
          {account.token ? (
            <GatewayAccountPanel
              profile={account.profile}
              connected={account.connected}
              loading={account.loadingAccount}
              busy={account.busy}
              onConnect={account.connect}
            />
          ) : (
            <>
              <div className="auth-tabs" aria-label="Acesso ao BaaS">
                <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')}>Entrar</button>
                <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')}>Criar conta</button>
              </div>
              {mode === 'login' ? (
                <LoginForm busy={account.busy} onSubmit={account.signIn} />
              ) : (
                <RegisterForm
                  busy={account.busy}
                  onSubmit={async (input) => {
                    const succeeded = await account.register(input)
                    if (succeeded) setMode('login')
                    return succeeded
                  }}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
