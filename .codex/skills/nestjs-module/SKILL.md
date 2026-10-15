---
name: nestjs-module
description: Use ao criar um novo módulo NestJS no backend BaaS (ex. checkout, wallet, withdrawals, webhooks). Gera a estrutura module → controller → service → repository → DTOs → entity, com Swagger, validação e registro no AppModule, seguindo os padrões do projeto.
---

# Criar módulo NestJS

## Quando usar

- Sempre que precisar adicionar uma nova área funcional ao backend (ex.: `checkout`, `wallet`, `withdrawals`, `webhooks`, `fees`).
- Não use para adicionar um único endpoint a um módulo existente — nesse caso, edite o módulo atual.
- Não use para tarefas de frontend.

## Estrutura de arquivos

Para um módulo chamado `checkout`, crie:

```
src/checkout/
├── checkout.module.ts
├── checkout.controller.ts
├── checkout.service.ts
├── checkout.repository.ts
├── entities/
│   └── checkout-link.entity.ts
├── dto/
│   ├── create-checkout.dto.ts
│   └── checkout-response.dto.ts
└── interfaces/
    └── checkout-repository.interface.ts
```

## Passo a passo

1. **Entity** — defina a entidade TypeORM com colunas explícitas, `@PrimaryGeneratedColumn('uuid')` e timestamps (`@CreateDateColumn`, `@UpdateDateColumn`).
2. **Interface do repositório** — declare os métodos que o Service precisa (ex.: `create`, `findById`, `findByExternalReference`). O Service depende da interface, não da implementação.
3. **Repository** — implemente a interface usando `Repository<Entity>` do TypeORM. Sem SQL cru.
4. **DTOs** — todos os campos com decorators do `class-validator` (`@IsString`, `@IsInt`, `@Min(1)`, etc.). Valores monetários sempre `@IsInt()` em centavos. Use `@ApiProperty()` para Swagger.
5. **Service** — injete a interface do repositório via `@Inject(TOKEN)` e demais dependências (ex.: `GatewayHttpService`). Nenhuma dependência concreta.
6. **Controller** — apenas orquestração. Use `@ApiTags`, `@ApiOperation`, `@ApiResponse`. Aplique `@Public()` apenas se for rota pública.
7. **Module** — registre `TypeOrmModule.forFeature([Entity])`, providers (Service, Repository, token da interface) e controller. Exporte o Service se outros módulos precisarem.
8. **AppModule** — importe o novo módulo.

## Padrões obrigatórios

- Dependência via interface: o Service depende de `ICheckoutRepository`, não de `CheckoutRepository`.
- Validação nunca no Controller — sempre no DTO.
- Retornos tipados: crie um `ResponseDto` e use `@ApiOkResponse({ type: CheckoutResponseDto })`.
- Nunca use `any`.
- Erros de domínio lançados com `HttpException` ou exceptions customizadas do Nest.

## Exemplo de provider com token

```typescript
export const CHECKOUT_REPOSITORY = 'CHECKOUT_REPOSITORY';

@Module({
  imports: [TypeOrmModule.forFeature([CheckoutLink])],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    CheckoutRepository,
    {
      provide: CHECKOUT_REPOSITORY,
      useExisting: CheckoutRepository,
    },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
```

## Verificação

- [ ] `npm run build` compila sem erros.
- [ ] `npm run lint` passa.
- [ ] Swagger mostra os novos endpoints em `/api`.
- [ ] Rotas protegidas retornam 401 sem token.
- [ ] Nenhum `any` no código do módulo.
- [ ] Service depende de interface, não de implementação concreta.