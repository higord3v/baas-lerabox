# Lera Box BaaS

Aplicação para lojistas com API NestJS, interface React e banco MySQL próprio. A API integra o gateway Lera Box por HTTP. O fluxo de conta do item 3.1 está disponível; checkout, carteira, saques e webhooks ainda serão implementados.

## Iniciar com Docker

1. Copie `.env.example` para `.env` e defina `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `BAAS_SESSION_SECRET` (ao menos 32 caracteres) e `BAAS_TOKEN_ENCRYPTION_KEY` (32 bytes codificados em Base64). É possível gerar os dois últimos com `openssl rand -hex 32` e `openssl rand -base64 32`. Não commite `.env`.
2. Execute `docker compose up --build -d` na raiz.
3. Abra a interface em <http://localhost:8080> e o Swagger da API em <http://localhost:3000/docs>. O MySQL local fica em `127.0.0.1:3307`.

Na primeira inicialização, a API aplica as migrations ao banco `baas`. A interface chama somente a API BaaS pelo caminho `/api`; o proxy encaminha as requisições para o backend.

## Cadastro e acesso

1. Em **Criar conta**, informe dados de PF ou PJ e um e-mail e telefone válidos. O cadastro chama `POST /api/users` do gateway. O sandbox aceita CPF/CNPJ fictício, mas envia as credenciais do gateway para o e-mail informado.
2. Defina uma senha **local**, exclusiva do BaaS, e use-a em **Entrar**. A sessão local usa um Bearer token próprio, separado do token do gateway.
3. Após receber a senha do gateway por e-mail, use **Conectar gateway**. A API chama `POST /api/auth/login`, cifra o token e a `ChaveLoja` antes de armazená-los em `gateway_accounts` e retorna somente o estado da conexão. A senha do gateway não é persistida.

Rotas BaaS: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /gateway-account/login` e `GET /gateway-account`. As três últimas exigem o Bearer token da sessão local. O contrato do provedor pode ser consultado no [Swagger do gateway](https://api.branchpay.com.br/docs).

## Desenvolvimento e verificação

O backend usa pnpm; o frontend usa npm. Rode `pnpm install`, `pnpm run lint`, `pnpm run test` e `pnpm run build` em `api/`; rode `npm install`, `npm run lint` e `npm run build` em `frontend/`.

Os testes de integração usam um banco MySQL **separado**. Crie `baas_test`, conceda acesso ao usuário de teste e configure `DB_NAME_TEST=baas_test`, `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` antes de executar `pnpm run test:e2e` em `api/`. O teste substitui as chamadas ao gateway por um mock; não cadastra usuários reais no sandbox.

As variáveis `BAAS_SESSION_SECRET` e `BAAS_TOKEN_ENCRYPTION_KEY` devem ser guardadas fora do repositório. Perder a chave de cifragem impede a leitura dos tokens já armazenados.
