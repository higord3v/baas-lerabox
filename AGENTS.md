# AGENTS.md — Desafio Técnico BaaS (VBA Systems)

Leia este arquivo antes de qualquer tarefa. Ele contém as regras permanentes do projeto.
Para tarefas específicas, consulte também os arquivos em `.codex/skills/`.

---

## Visão geral do projeto

Aplicação BaaS (Banking as a Service) que integra o gateway de pagamento
**Lera Box** como provedor de processamento. O produto é usado pelo lojista
para criar links de checkout, acompanhar carteira/extrato, solicitar saques
e receber webhooks do gateway.

- **Gateway:** `https://api.branchpay.com.br`
- **Swagger do gateway:** `https://api.branchpay.com.br/doscs`
- **Documentação do desafio:** consulte o PDF/texto do desafio no repositório.

**Arquitetura:**

```
[ React / Vite ] -> [ NestJS BaaS API ] -> [ Gateway Lera Box ]
                          |
                     [ MySQL BaaS ]
                          ^
                [ Webhooks do Gateway ]
```

O banco MySQL é **próprio da aplicação BaaS**. É proibido acessar diretamente
o banco do gateway; toda integração ocorre via HTTP.

---

## Stack obrigatória

### Backend
- TypeScript + NestJS
- TypeORM + MySQL
- class-validator / class-transformer para DTOs
- @nestjs/swagger para documentação
- Middleware Nest para logging e correlation ID
- Guards para autenticação e isolamento de conta

### Frontend
- React + Vite
- Consome exclusivamente a API do BaaS (nunca o gateway diretamente)

---

## Comandos essenciais

```bash
# Backend
cd backend
npm install
npm run start:dev          # desenvolvimento com watch
npm run test               # testes unitários
npm run test:e2e           # testes de integração
npm run lint               # ESLint
npm run build              # compilação para produção

# Frontend
cd frontend
npm install
npm run dev                # Vite dev server
npm run build              # build de produção
npm run lint

# Docker (diferencial)
docker compose up --build  # sobe API + frontend + MySQL
```

Sempre execute `npm run lint` e `npm run test` antes de considerar uma
tarefa concluída. Se o teste quebrar, corrija antes de finalizar.

---

## Regras de arquitetura

### Camadas (NestJS)

```
Controller -> Service -> Repository -> Entity (TypeORM)
```

- **Controller:** apenas orquestração HTTP. Não contém lógica de negócio.
- **Service:** regra de negócio e integração com o gateway.
- **Repository:** acesso a dados via TypeORM. Nenhum SQL cru em Services.
- **DTO:** validação de entrada com class-validator. Nunca receber `any` do cliente.

### Inversão de dependência

- Services dependem de **interfaces** de repositórios, não de implementações concretas.
- Use `@InjectRepository()` do TypeORM e providers customizados quando necessário.
- Módulos devem exportar apenas o que é público.

### Integração com o gateway

- O token do gateway é **armazenado apenas no backend** (entidade `gateway_accounts`).
- O frontend nunca vê a senha nem o token do gateway.
- Toda chamada ao gateway passa por um `GatewayHttpService` (ou nome equivalente)
  centralizado. Nenhum `fetch`/`axios` espalhado pelo código.
- Valores monetários são sempre tratados em **centavos** (integer). Nunca use float.

### Webhooks

- Ative `rawBody: true` na criação da aplicação Nest:
  `NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })`
- A verificação de assinatura `X-Lera-Box-Signature` usa HMAC sobre o **corpo bruto**.
- Idempotência é garantida por **restrição de chave única no banco** (ex.: `externalReference` + `eventType`),
  não apenas por verificação em código.
- O handler de webhook **não confia em status vindos do frontend**. O status local
  só muda após processamento do webhook ou consulta ativa ao gateway.

### Guards e isolamento

- `APP_GUARD` global registrado no `AppModule`.
- Rotas públicas marcadas com `@Public()`.
- Toda rota protegida deve retornar 401 sem credenciais.
- O token de uma conta **não pode acessar dados de outra conta**.
  Isso deve ser testado com um teste de integração.

---

## Convenções de código

- **TypeScript strict mode** ativado.
- Aspas simples, sem ponto e vírgula.
- Nomes de arquivos em `kebab-case`.
- Classes em `PascalCase`, variáveis/funções em `camelCase`.
- DTOs terminam com `Dto` (ex.: `CreateCheckoutDto`).
- Entidades terminam com o nome da tabela em singular (ex.: `CheckoutLink`).
- **Clean Code:** funções curtas, nomes descritivos, sem comentários óbvios.
- **SOLID:** uma responsabilidade por classe; interfaces segregadas;
  dependa de abstrações, não de concreções.

---

## Commits e PRs

Siga **Conventional Commits** rigorosamente:

```
feat: add Pix checkout endpoint
fix: correct feePercent validation on card payment
docs: update README with Docker setup
test: add webhook signature validation test
refactor: extract gateway HTTP client
chore: bump NestJS to latest patch
```

- Commits pequenos e focados. Uma mudança lógica por commit.
- PRs com título no mesmo formato.
- Antes de commitar, rode `npm run lint` e `npm run test`.

---

## Segurança

- **Nunca** commite arquivos `.env`, tokens ou credenciais.
- Senha do gateway **nunca** sai do backend.
- Webhooks são validados por assinatura quando houver secret.
- `externalReference` é sempre alinhado ao gateway para conciliação.
- Valores monetários em centavos.
- Erros de integração com o gateway devem ser tratados e logados,
  sem expor detalhes internos ao cliente.

---

## Camadas de conhecimento do Codex

Este projeto usa três camadas de contexto para o Codex:

1. **AGENTS.md** (este arquivo) — regras permanentes, comandos, arquitetura.
2. **`.codex/skills/`** — playbooks para tarefas repetíveis (criar módulo,
   adicionar endpoint, escrever teste de integração, etc.).
3. **`.codex/memory/`** — decisões tomadas, padrões aprendidos, glossário do domínio.

Antes de iniciar uma tarefa, verifique se há uma skill relevante em `.codex/skills/`.
Se o projeto já tem um padrão para algo, **reuse-o** em vez de criar um novo.

---

## O que NÃO fazer

- Não acesse o banco do gateway.
- Não exponha senha/token do gateway no frontend.
- Não use `any` em DTOs ou retornos de API.
- Não crie SQL cru fora do Repository.
- Não altere entidades do banco sem migration.
- Não faça commits grandes com múltiplas mudanças não relacionadas.
- Não ignore falhas de webhook; todo payload deve ser registrado e processado
  com idempotência.