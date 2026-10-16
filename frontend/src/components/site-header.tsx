interface SiteHeaderProps {
  signedIn: boolean
  activePath: string
  onNavigate: (path: string) => void
  onSignOut: () => void
}

const navigation = [
  { href: '/wallet', label: 'Carteira' },
  { href: '/checkout', label: 'Checkout' },
  { href: '/extrato', label: 'Extrato' },
]

export function SiteHeader({ signedIn, activePath, onNavigate, onSignOut }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand__mark">LB</span>
        <span>Lera Box <strong>BaaS</strong></span>
      </div>
      {signedIn && (
        <div className="site-header__actions">
          <nav className="site-nav" aria-label="Navegação principal">
            {navigation.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                aria-current={activePath === href ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate(href)
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <button className="text-button" type="button" onClick={onSignOut}>Sair</button>
        </div>
      )}
    </header>
  )
}
