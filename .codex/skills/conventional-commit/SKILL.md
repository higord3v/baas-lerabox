---
name: conventional-commit
description: Use ao preparar commits no repositório do desafio BaaS. Agrupa mudanças logicamente, escreve mensagem no formato Conventional Commits em inglês, e garante commits pequenos e focados. Aplica antes de qualquer `git commit`.
---

# Preparar commit

## Quando usar

- Antes de qualquer `git commit`.
- Ao finalizar uma unidade lógica de trabalho (endpoint completo, teste, refatoração).
- Ao preparar PR.
- Não use para decidir arquitetura (isso é decisão de código, não de commit).

## Regras

1. **Um commit = uma mudança lógica.** Se você fez três coisas (ex.: entidade + handler + teste de algo novo), considere separar.
2. **Mensagem em inglês**, no formato Conventional Commits.
3. **Título no imperativo presente** (`add`, não `added` ou `adds`).
4. **Sem ponto final** no título.
5. **Escopo opcional**, mas recomendado para deixar claro o módulo afetado.
6. Se o commit tocar em mais de 5 arquivos por motivo não trivial, divida.

## Formato

```
<type>(<scope>): <subject>

[corpo opcional]

[rodapé opcional]
```

## Tipos permitidos

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade no produto BaaS |
| `fix` | Correção de bug |
| `refactor` | Mudança que não altera comportamento |
| `test` | Adição/ajuste de teste |
| `docs` | Apenas documentação (README, AGENTS.md) |
| `chore` | Build, deps, config (não afeta código de produção) |
| `style` | Formatação, lint, sem mudança de comportamento |
| `perf` | Melhoria de performance |
| `ci` | Configuração de CI/CD |

## Escopos recomendados

`auth`, `checkout`, `pix`, `card`, `wallet`, `withdrawals`, `webhooks`, `fees`, `users`, `docker`, `swagger`, `frontend`, `config`.

## Exemplos

```
feat(checkout): add Pix checkout endpoint
feat(checkout): add card checkout with fees lookup
fix(webhooks): use timingSafeEqual for signature comparison
test(webhooks): cover idempotency on duplicated payload
refactor(gateway): extract GatewayHttpService
docs(readme): add Docker Compose setup
chore(deps): bump @nestjs/swagger to 7.x
```

## Antes de commitar — checklist

- [ ] `npm run lint` passa.
- [ ] `npm run test` passa.
- [ ] `npm run test:e2e` passa (quando houver testes e2e para o que mudou).
- [ ] Nenhum `.env`, token, senha ou credencial foi incluído. Verifique com `git diff --staged`.
- [ ] O commit não mistura assuntos (ex.: `feat` + `style` + `docs` não relacionados).
- [ ] Se tocou em webhook, o commit tem teste de idempotência ou o teste veio em commit anterior.
- [ ] Se tocou em rota protegida, existe teste de 401.
- [ ] Se adicionou entidade, existe migration correspondente no mesmo commit (ou em commit imediatamente anterior, marcado com `chore(db)`).

## Comandos

```bash
git status
git diff --staged
git add <arquivos específicos>     # nunca git add . sem revisar
git commit -m "feat(checkout): add Pix checkout endpoint"
```

Prefira adicionar arquivos por nome a `git add .` — isso evita commitar `.env`, arquivos de IDE ou artefatos de build.

## Sinais de que o commit precisa ser dividido

- Título precisaria de "and" para descrever.
- Diff mistura `src/` e `test/` de features diferentes.
- Diff mistura configuração (`package.json`, `tsconfig`) com código de produção.
- Você sente que precisa explicar demais no corpo.