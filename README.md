# Lera Box BaaS

Aplicação para lojistas com API NestJS, interface React e banco MySQL próprio. A API integra o gateway Lera Box por HTTP. Os fluxos de conta, checkout, carteira, extrato, saques e webhooks dos itens 3.1 a 3.6 estão disponíveis.

## Iniciar com Docker

1. Copie `.env.example` para `.env` e defina `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `BAAS_SESSION_SECRET` (ao menos 32 caracteres) e `BAAS_TOKEN_ENCRYPTION_KEY` (32 bytes codificados em Base64). É possível gerar os dois últimos com `openssl rand -hex 32` e `openssl rand -base64 32`. Não commite `.env`.
2. Execute `docker compose up --build -d` na raiz.
3. Abra a interface em <http://localhost:8080> e o Swagger da API em <http://localhost:3000/docs>. O MySQL local fica em `127.0.0.1:3307`.

Na primeira inicialização, a API aplica as migrations ao banco `baas`. A interface chama somente a API BaaS pelo caminho `/api`; o proxy encaminha as requisições para o backend.

## Rodar a API localmente

Use Node.js 24 e pnpm. Configure o `.env` da raiz como na seção acima e inicie apenas o MySQL com `docker compose up -d mysql`. Em seguida, execute na pasta `api/`:

```bash
pnpm install
pnpm run build
pnpm run db:migrate
pnpm run start:dev
```

Os scripts locais carregam automaticamente `../.env`. A conexão usa `127.0.0.1:3307`, usuário `baas` e a senha `MYSQL_PASSWORD` desse arquivo. Se necessário, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` substituem esses padrões. Para usar a porta 3000 com a API local e manter o serviço do Compose disponível ao frontend, execute `API_HOST_PORT=3001 docker compose up -d api` na raiz. Para liberar a porta 3000 quando a API do Compose já estiver em execução, use `docker compose stop api`.

## Cadastro e acesso

1. Em **Criar conta**, informe dados de PF ou PJ e um e-mail e telefone válidos. O cadastro chama `POST /api/users` do gateway. O sandbox aceita CPF/CNPJ fictício, mas envia as credenciais do gateway para o e-mail informado.
2. Defina uma senha **local**, exclusiva do BaaS, e use-a em **Entrar**. A sessão local usa um Bearer token próprio, separado do token do gateway.
3. Após receber a senha do gateway por e-mail, use **Conectar gateway**. A API chama `POST /api/auth/login`, cifra o token e a `ChaveLoja` antes de armazená-los em `gateway_accounts` e retorna somente o estado da conexão. A senha do gateway não é persistida.

Rotas BaaS: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /gateway-account/login` e `GET /gateway-account`. As três últimas exigem o Bearer token da sessão local. O contrato do provedor pode ser consultado no [Swagger do gateway](https://api.branchpay.com.br/docs).

## Links de checkout

Após conectar a conta do gateway, o lojista cria links Pix ou cartão pela interface. Para cartão, a interface consulta as taxas da bandeira e permite selecionar as parcelas; a API registra a taxa do momento da criação e verifica a tabela novamente antes de cobrar. O link público `/checkout/:id` permite ao pagador gerar o Pix ou pagar com cartão. No Pix, a página apresenta QR Code e código copia e cola.

Rotas protegidas: `POST /checkout-links`, `GET /checkout-links`, `GET /checkout-links/:id` e `GET /checkout-links/fees?brand=VISA`. Rotas públicas: `GET /checkout/:id`, `POST /checkout/:id/pix`, `POST /checkout/:id/card` e `GET /checkout/:id/orders/:orderId`. Valores são enviados em centavos. Cada pagamento usa um `attemptKey` UUID para evitar cobranças repetidas quando a requisição é reenviada.

O estado final de um pedido é confirmado por `GET /api/payments/:id` do gateway durante a consulta do resultado. A resposta inicial da cobrança, mesmo quando informa `APPROVED`, não atualiza o estado local. O tratamento de webhooks permanece no item 3.6.

## Carteira e extrato

Após conectar o gateway, a página **Carteira** mostra o saldo consultado em tempo real e permite solicitar saques. A página **Extrato** reúne transações do gateway com pedidos e links encerrados registrados no BaaS. Os filtros de situação (sucesso, falha, expirado, cancelado e pendente) e tipo (Pix, cartão ou saque) são aplicados no backend, sempre para o lojista autenticado.

Rotas protegidas: `GET /wallet` retorna `balanceCents`; `GET /wallet/transactions?status=&type=&limit=` retorna `items`, ordenados dos mais recentes aos mais antigos. O limite padrão é 50 e o máximo é 100. As duas rotas exigem o Bearer token local; somente o backend usa o token do gateway.

## Saques

Na página **Carteira**, o lojista pode solicitar um saque para uma chave Pix de outra conta, informando valor em reais, chave Pix e CPF/CNPJ do titular. O frontend converte o valor para centavos antes de chamar o BaaS. O gateway disponibiliza destino por chave Pix (`pixKey`); não há campos de agência e conta no contrato atual.

Rotas protegidas: `POST /withdrawals` solicita o saque, `GET /withdrawals` lista as 20 solicitações locais mais recentes e `GET /withdrawals/:id` consulta o status atual no gateway. O `POST` exige `requestId` UUID, `amountCents`, `pixKey` e `document`; a referência externa `WD-<requestId>` evita repetir o saque em um reenvio. O BaaS cifra os dados de destino no banco e não os devolve na resposta. O estado local só é atualizado após consulta ativa ao gateway ou webhook assinado; até a confirmação, a solicitação permanece pendente. Saques também aparecem no extrato consolidado.

## Webhooks

O cadastro dos eventos `PAYMENT_PIX`, `PAYMENT_CARD` e `WITHDRAWAL` é feito pela API BaaS, por exemplo no Swagger em `/docs`. Informe a URL pública HTTPS da API no corpo da requisição de cadastro. A API cria uma URL exclusiva por lojista e evento, gera um segredo HMAC e o guarda cifrado. A URL precisa ser alcançável pelo gateway; `localhost` e a rede interna do Docker não funcionam como callback externo.

`POST /webhooks/subscriptions` recebe `{ "event": "PAYMENT_PIX", "callbackBaseUrl": "https://api.exemplo.com" }` com o Bearer token local; `GET /webhooks/subscriptions` lista os callbacks do lojista sem revelar o segredo. O gateway envia os eventos para `POST /webhooks/lera-box/:subscriptionId`. Essa rota pública valida `X-Lera-Box-Signature` sobre o corpo bruto, registra o payload para auditoria e processa cada evento uma vez com chave única no MySQL. Pagamentos aprovados atualizam o pedido e marcam o link como pago; pagamentos recusados atualizam o pedido e deixam o link disponível. Saques têm o status local atualizado pelo evento assinado.

Após persistir um evento, a API avisa os navegadores conectados por **Server-Sent Events (SSE)**. `GET /webhooks/updates` exige o Bearer token local e envia apenas avisos do próprio lojista; `GET /webhooks/checkout/:linkId/updates` avisa a página pública daquele link. O aviso não traz dados de pagamento: o frontend consulta novamente a API BaaS para obter o estado confirmado. O checkout público também mantém a consulta periódica como recuperação quando a conexão SSE não estiver disponível.

## Desenvolvimento e verificação

O backend usa pnpm; o frontend usa npm. Rode `pnpm install`, `pnpm run lint`, `pnpm run test` e `pnpm run build` em `api/`; rode `npm install`, `npm run lint` e `npm run build` em `frontend/`.

Os testes de integração usam um banco MySQL **separado**. Crie `baas_test`, conceda acesso ao usuário de teste e configure `DB_NAME_TEST=baas_test`, `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` antes de executar `pnpm run test:e2e` em `api/`. O teste substitui as chamadas ao gateway por um mock; não cadastra usuários reais no sandbox.

As variáveis `BAAS_SESSION_SECRET` e `BAAS_TOKEN_ENCRYPTION_KEY` devem ser guardadas fora do repositório. Perder a chave de cifragem impede a leitura dos tokens já armazenados.
