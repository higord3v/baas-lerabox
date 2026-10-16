interface SiteHeaderProps {
  signedIn: boolean
  onSignOut: () => void
}

export function SiteHeader({ signedIn, onSignOut }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand__mark">LB</span>
        <span>Lera Box <strong>BaaS</strong></span>
      </div>
      {signedIn && <button className="text-button" type="button" onClick={onSignOut}>Sair</button>}
    </header>
  )
}
