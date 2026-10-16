---
name: gateway-endpoint
description: Use ao integrar um novo endpoint do gateway Lera Box (Pix, cartão, wallet, fees, withdrawals, users, auth). Centraliza chamadas HTTP no GatewayHttpService, trata erros, aplica Bearer token e alinha externalReference para conciliação.
---

# Integrar endpoint do gateway

## Quando usar

- Sempre que o backend BaaS precisar chamar uma nova rota do gateway Lera Box.
- Sempre que precisar ajustar tratamento de erro, autenticação ou mapeamento de resposta de uma chamada existente ao gateway.
- Não use para lidar com webhooks recebidos — isso é a skill `webhook-handler`.
- Não use para rotas internas do BaaS — isso é a skill `nestjs-module`.

## Regras invariáveis

1. **Toda chamada passa pelo `GatewayHttpService`.** Nunca use `axios` ou `fetch` diretamente em Services de domínio.
2. **Bearer token vem do backend.** Nunca aceite token vindo do frontend.
3. **Valores monetários em centavos** (inteiro). Nunca float. Se o gateway retornar em outra unidade, converta na borda.
4. **`externalReference`** deve ser gerado no BaaS, único por operação, e persistido na entidade local (`checkout_links`, `orders`, etc.).
5. **Nunca acesse o banco do gateway.** Toda integração é HTTP.

## Contrato

Consulte sempre o Swagger do gateway antes de implementar:

- **Base:** `https://api.branchpay.com.br/api`
- **Swagger:** `https://api.branchpay.com.br/docs`

Se o Swagger divergir do texto do desafio, **prevaleça o Swagger**.

## Estrutura do GatewayHttpService

O `GatewayHttpService` deve:

- Injetar um cliente HTTP (`@nestjs/axios` ou `HttpService`).
- Ter métodos tipados por operação: `createPix`, `createCardPayment`, `getFees`, `getWallet`, `getTransactions`, `createWithdrawal`, `getWithdrawal`, `registerWebhook`.
- Tratar erros do gateway mapeando para exceptions do BaaS (ex.: 4xx do gateway → `BadRequestException` com mensagem do gateway; 5xx → `ServiceUnavailableException`).
- Logar cada requisição com `correlationId`, método, URL, status e duração.
- Nunca logar o corpo completo se contiver token ou senha.

## Passo a passo

1. Leia o Swagger do gateway para entender request/response.
2. Crie um DTO interno (do BaaS) para a entrada — não vaze o DTO do gateway para o Controller.
3. Adicione um método no `GatewayHttpService` com tipo de retorno próprio.
4. No Service de domínio, chame esse método e mapeie a resposta para uma entidade local.
5. Persista `externalReference`, `gatewayId` (id retornado pelo gateway) e o status inicial.
6. Adicione teste unitário mockando o `GatewayHttpService`.

## Exemplo — Pix

```typescript
async createPix(input: CreatePixInput): Promise<PixResponse> {
  const { data } = await this.http.post<PixResponse>(
    '/payments/pix',
    {
      amount: input.amountInCents,
      externalReference: input.externalReference,
    },
    { headers: this.buildAuthHeaders(input.accessToken) },
  );
  return data;
}
```

## Exemplo — Cartão (atenção ao feePercent)

Antes de chamar `/payments/card`:

1. Chame `GET /fees` (opcionalmente `?brand=`).
2. Localize a entrada correspondente a `installments`.
3. Use exatamente o `feePercent` retornado.
4. Persista `feePercent` e `installments` na entidade local.

Se o `feePercent` divergir, o gateway rejeita. Nunca invente nem arredonde.

## Verificação

- [ ] Nenhum `fetch`/`axios` fora do `GatewayHttpService`.
- [ ] Token do gateway lido de `gateway_accounts`, não do request.
- [ ] `externalReference` persistido no BaaS.
- [ ] Valores em centavos.
- [ ] Erros do gateway mapeados para exceptions do BaaS.
- [ ] Logs não expõem token/senha.
- [ ] Teste unitário cobre o caminho felizes e pelo menos um erro do gateway.