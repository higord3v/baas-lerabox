---
name: webhook-handler
description: Use ao implementar ou alterar o recebimento de webhooks do gateway Lera Box (PAYMENT_PIX, PAYMENT_CARD, WITHDRAWAL). Cobre rawBody, verificação HMAC da X-Lera-Box-Signature, idempotência por chave única no banco e atualização de status local.
---

# Implementar webhook handler

## Quando usar

- Ao receber um novo tipo de evento do gateway.
- Ao alterar verificação de assinatura ou política de idempotência.
- Ao ajustar como o status local é atualizado após callback.
- Não use para chamar o gateway (isso é `gateway-endpoint`).

## Regras invariáveis

1. **`rawBody: true` na criação da app.** Sem isso, a verificação de assinatura falha em runtime.
2. **Verificação de assinatura usa o corpo bruto**, não `req.body` parseado.
3. **Idempotência via chave única no banco** — não apenas checagem em código.
4. **Status local só muda** após webhook processado ou consulta ativa ao gateway. Nunca por ação do frontend.
5. **Todo payload recebido é registrado** em `webhook_events` antes do processamento, mesmo se inválido (para auditoria).

## Estrutura

```
src/webhooks/
├── webhooks.module.ts
├── webhooks.controller.ts
├── webhooks.service.ts
├── webhooks.repository.ts
├── signature/
│   └── signature-verifier.service.ts
├── handlers/
│   ├── payment-pix.handler.ts
│   ├── payment-card.handler.ts
│   └── withdrawal.handler.ts
├── entities/
│   └── webhook-event.entity.ts
└── dto/
    └── webhook-payload.dto.ts
```

## Entidade `webhook_events`

Colunas mínimas:

- `id` (uuid, PK)
- `eventId` (string, **UNIQUE** com `eventType`)
- `eventType` (enum: `PAYMENT_PIX`, `PAYMENT_CARD`, `WITHDRAWAL`)
- `externalReference` (string, indexado)
- `payload` (json)
- `signatureValid` (boolean)
- `processedAt` (nullable timestamp)
- `createdAt`

A **restrição UNIQUE em (`eventId`, `eventType`)** é o que garante idempotência sob concorrência. Se você só checar no código antes de inserir, duas requisições simultâneas podem duplicar.

## Fluxo do Controller

```typescript
@Post('lera-box')
@Public()
async receive(
  @Req() req: RawBodyRequest<Request>,
  @Headers('x-lera-box-signature') signature: string,
  @Body() body: WebhookPayloadDto,
) {
  return this.webhooksService.handle({
    rawBody: req.rawBody,
    signature,
    payload: body,
  });
}
```

- O handler **não** é protegido por `AuthGuard` (não há Bearer do lojista na chamada do gateway).
- A autenticação é feita **pela assinatura**.
- Marque com `@Public()` para o guard global não bloquear.

## Verificação de assinatura

```typescript
verify(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  );
}
```

- Use `timingSafeEqual` — nunca `===` em comparação de assinatura.
- Se não houver secret configurado, registre a ausência e permita o processamento (conforme contrato).

## Processamento com idempotência

1. Verifique a assinatura. Registre em `webhook_events` com `signatureValid`.
2. Tente inserir o evento por `(eventId, eventType)`. Se já existir, retorne 200 e **não reprocesse**.
3. Despache para o handler específico (`PAYMENT_PIX`, `PAYMENT_CARD`, `WITHDRAWAL`).
4. O handler localiza a entidade local por `externalReference` e atualiza o status.
5. Marque `processedAt`.
6. Retorne 200 rapidamente. Processamento pesado (ex.: PDF, e-mail) deve ir para fila ou job separado.

## Verificação

- [ ] `rawBody: true` ativado no bootstrap.
- [ ] Comparação de assinatura usa `timingSafeEqual`.
- [ ] Constraint UNIQUE em (`eventId`, `eventType`) existe via migration.
- [ ] Payload é registrado mesmo quando a assinatura é inválida.
- [ ] Teste e2e envia o mesmo payload duas vezes e valida um único processamento.
- [ ] Status local só muda no handler, nunca por ação do frontend.
- [ ] Rota marcada como `@Public()` mas com validação de assinatura obrigatória.