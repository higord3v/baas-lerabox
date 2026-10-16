const steps = [
  'Crie sua conta e informe dados reais de contato.',
  'Entre com a senha local definida no cadastro.',
  'Conecte a conta do gateway com a senha recebida por e-mail.',
]

export function IntroSection() {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <span className="eyebrow">PLATAFORMA DO LOJISTA</span>
      <h1 id="intro-title">Seus pagamentos começam com uma conta conectada.</h1>
      <p>Cadastre sua operação, acesse o BaaS e conecte as credenciais enviadas pelo gateway ao seu e-mail.</p>
      <ol className="intro__steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
