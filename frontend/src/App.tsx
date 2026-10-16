import { useEffect, useState } from 'react'
import { Feedback } from './components/feedback'
import { CheckoutManager } from './components/checkout-manager'
import { GatewayAccountPanel } from './components/gateway-account-panel'
import { IntroSection } from './components/intro-section'
import { LoginForm } from './components/login-form'
import { RegisterForm } from './components/register-form'
import { PublicCheckout } from './components/public-checkout'
import { SiteHeader } from './components/site-header'
import { StatementPage, WalletPage } from './components/merchant-pages'
import { useMerchantAccount } from './hooks/use-merchant-account'
import './App.css'

type AuthMode = 'login' | 'register'

function MerchantApp() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [pathname, setPathname] = useState(window.location.pathname)
  const account = useMerchantAccount()

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: string) {
    if (path === pathname) return
    window.history.pushState({}, '', path)
    setPathname(path)
  }

  async function signIn(input: Parameters<typeof account.signIn>[0]) {
    const succeeded = await account.signIn(input)
    if (succeeded) navigate('/wallet')
  }

  function signOut() {
    account.signOut()
    navigate('/')
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    account.clearError()
  }

  return (
    <main className="page">
      <SiteHeader
        signedIn={Boolean(account.token)}
        activePath={pathname}
        onNavigate={navigate}
        onSignOut={signOut}
      />
      {account.token ? (
        <div className="merchant-content">
          <Feedback error={account.error} notice={account.notice} />
          {account.loadingAccount ? (
            <p className="page-message">Carregando sua conta...</p>
          ) : !account.connected ? (
            <section className="panel merchant-content__panel" aria-label="Conectar conta do gateway">
              <GatewayAccountPanel
                profile={account.profile}
                connected={account.connected}
                loading={account.loadingAccount}
                busy={account.busy}
                onConnect={account.connect}
              />
            </section>
          ) : pathname === '/checkout' ? (
            <CheckoutManager token={account.token} />
          ) : pathname === '/extrato' ? (
            <StatementPage />
          ) : (
            <WalletPage />
          )}
        </div>
      ) : (
        <div className={pathname === '/' ? 'layout' : 'auth-layout'}>
          {pathname === '/' && <IntroSection />}
          <section className="panel" aria-label="Acesso do lojista">
            <Feedback error={account.error} notice={account.notice} />
            <div className="auth-tabs" aria-label="Acesso ao BaaS">
              <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')}>Entrar</button>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')}>Criar conta</button>
            </div>
            {mode === 'login' ? (
              <LoginForm busy={account.busy} onSubmit={signIn} />
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
          </section>
        </div>
      )}
    </main>
  )
}

function App() {
  const publicCheckoutId = window.location.pathname.match(/^\/checkout\/([0-9a-f-]{36})\/?$/i)?.[1]
  return publicCheckoutId ? <PublicCheckout id={publicCheckoutId} /> : <MerchantApp />
}

export default App
