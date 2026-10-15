---
name: integration-test
description: Use ao escrever testes de integração (e2e) no backend BaaS com supertest + banco de teste. Cobre autenticação (401), isolamento de conta entre lojistas, idempotência de webhook e fluxos críticos (Pix, cartão, saque).
---

# Escrever teste de integração

## Quando usar

- Ao adicionar um novo endpoint protegido.
- Ao implementar Guard ou alterar política de autenticação.
- Ao mexer em webhooks (idempotência, assinatura).
- Ao alterar isolamento de conta (dados por lojista).
- Não use para testar funções puras — isso é teste unitário.

## Estrutura

```
test/
├── setup/
│   ├── test-app.ts          # cria a app Nest com rawBody: true
│   └── database.ts          # inicializa banco de teste
├── fixtures/
│   └── factory.ts           # helpers para criar usuários/contas
└── e2e/
    ├── auth.e2e-spec.ts
    ├── checkout-pix.e2e-spec.ts
    ├── checkout-card.e2e-spec.ts
    ├── wallet.e2e-spec.ts
    ├── withdrawals.e2e-spec.ts
    ├── webhooks.e2e-spec.ts
    └── isolation.e2e-spec.ts
```

## Configuração essencial

O `test-app.ts` **precisa** criar a app com `rawBody: true`, senão os testes de webhook falham:

```typescript
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
```

- Use um banco MySQL de teste separado (variável `DB_NAME_TEST`).
- Antes de cada `describe`, limpe as tabelas relevantes.
- Mocke o `GatewayHttpService` via `overrideProvider` — nunca chame o gateway real em CI.

## O que sempre testar em rotas protegidas

Para **cada** rota protegida nova:

1. **401 sem token** — deve retornar 401.
2. **401 com token inválido** — deve retornar 401.
3. **200 com token válido** — caminho felizes.
4. **Validação de DTO** — payload inválido retorna 400 com a mensagem certa.

## Teste de isolamento de conta (obrigatório)

Crie `isolation.e2e-spec.ts` que:

1. Cria dois lojistas (A e B) com tokens distintos.
2. Loja A cria um checkout / saque / webhook.
3. Loja B tenta acessar o recurso de A por ID.
4. **Espera 404 ou 403** — nunca 200.

Sem esse teste, o critério "isolamento por conta" não pode ser considerado atendido.

## Teste de idempotência de webhook

1. Envie o mesmo payload de webhook duas vezes.
2. Verifique que o estado local mudou **apenas uma vez**.
3. Verifique que há **um único** registro em `webhook_events` para o mesmo `eventId`.

## Teste de assinatura de webhook

- Payload com assinatura válida → 200.
- Payload com assinatura inválida → 401 (ou 400, conforme contrato).
- Payload **sem** o header `X-Lera-Box-Signature` quando secret está configurado → 401.

## Comandos

```bash
npm run test:e2e                # todos os e2e
npm run test:e2e -- isolation   # apenas isolamento
npm run test:e2e -- webhooks    # apenas webhooks
```

## Verificação

- [ ] Cada rota protegida tem teste de 401.
- [ ] Existe `isolation.e2e-spec.ts` cobrindo pelo menos um recurso.
- [ ] Existe teste de idempotência de webhook.
- [ ] Existe teste de assinatura inválida.
- [ ] O gateway é sempre mockado (nenhuma chamada HTTP real).
- [ ] Banco de teste é isolado do banco de desenvolvimento.