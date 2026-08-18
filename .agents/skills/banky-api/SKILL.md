---
name: banky-api
description: Consultar contratos HTTP, autenticação, parâmetros, payloads e comportamentos esperados da API NestJS banky_api (contas, categorias, transações, pagamentos, parâmetros, NLP e auto-review). Usar quando integrar consumidores, validar rotas, revisar impacto de mudanças de contrato, depurar fluxos financeiros ou NLP no ecossistema Banky.
---

# banky-api

Referência operacional dos endpoints da API principal do Banky (`banky_api`).

**Fonte de verdade:** código em `src/modules/**/controllers`, DTOs Zod/Swagger e services. Em conflito com memória ou suposição, prevalece o checkout.

## Quando usar

- Integrar app mobile, MCP ou outro consumidor com a API.
- Validar método, path, auth, body, query e status code antes de implementar ou testar.
- Avaliar impacto de mudança de contrato HTTP (rotas, DTOs, respostas).
- Depurar fluxos financeiros (transação, transferência, pagamento de cartão) ou NLP (feedback, treino, auto-review).
- Responder perguntas sobre comportamento esperado sem inventar regra de negócio.

## Fluxo

1. Identificar o módulo alvo (auth, accounts, transactions, nlp, etc.).
2. Consultar [references/endpoints.md](references/endpoints.md) — índice rápido no final do arquivo.
3. Para termos de domínio (conta, categoria, feedback, alias, candidato), consultar [references/glossary.md](references/glossary.md).
4. Confirmar auth: Bearer JWT (`@Auth()`), credenciais locais (`@LocalAuth()`), refresh (`@Reauth()`) ou público.
5. Preferir DTOs com Zod (`createZodDto`) como contrato validado; marcar `[sem Zod]` quando só Swagger existir.
6. Ao alterar rota/DTO/resposta, registrar impacto em consumidores (`banky_app`, `bany_mcp`) e rodar `pnpm run test:e2e` se o contrato mudar.

## Configuração global

| Item | Valor |
|------|-------|
| Prefixo | `/api` |
| Versão default | `1` (URI) → base `/api/v1` |
| Health | `/api/health` (sem `/v1`) |
| Swagger | `/swagger` |
| Rate limit | 10 req / 30 s (global) |
| Validação | `ZodValidationPipe` nos DTOs Zod |
| Erros DB | `409 Conflict` via interceptor |
| Campos base | `{ id, createdAt, updatedAt }` em entidades |

## Auth (resumo)

| Decorator | Credencial | Uso |
|-----------|------------|-----|
| `@LocalAuth()` | body `username`, `password` | login |
| `@Auth()` | header `Authorization: Bearer <accessToken>` | rotas protegidas |
| `@Reauth()` | body `refreshToken` | refresh de tokens |

Login/refresh retornam `{ accessToken, expires, refreshToken, authenticated? }`. Access token ~1 h; refresh ~5 dias.

## Módulos (visão rápida)

| Módulo | Base path | Auth | Escopo |
|--------|-----------|------|--------|
| Auth | `/api/v1/auth` | misto | login, register, refresh |
| Users | `/api/v1/users` | JWT | perfil e listagem |
| Accounts | `/api/v1/accounts` | JWT | contas do owner |
| Categories | `/api/v1/categories` | JWT | categorias hierárquicas |
| Transactions | `/api/v1/transactions` | JWT | CRUD, transfer, credit-payment |
| Payments | `/api/v1/payments` | JWT | tipos de pagamento (catálogo global) |
| Parameters | `/api/v1/parameters` | JWT | definições + valores por owner |
| NLP | `/api/v1/nlp` | JWT | parse, feedback, treino, auto-review |
| Health | `/api/health` | público | versão e memória |

## Regras

- Não inventar regra financeira; sem evidência em controller/service, tratar como hipótese ou omitir.
- Rotas `GET/PUT/DELETE /:id` em accounts, categories e transactions **não** verificam ownership — documentado como gap conhecido.
- `GET /users` retorna todos os usuários para qualquer JWT válido.
- Transações atualizam saldo (`ammount`) apenas em `POST /transactions` e fluxos transfer/credit-payment; update/delete não revertem saldo.
- NLP consolidado na API principal; tratar auto-review como sombra analítica até `apply` de candidato.
- Parâmetros obrigatórios para fluxos especiais: `unknown_*_category`, `transference_*_category`, `credit_payment_category`.
- Throttling global pode afetar operações em lote de auto-review.

## Paginação

Endpoints paginados (`GET /transactions`, `GET /nlp`, `GET /nlp/auto-review/report`):

```typescript
{ items: T[]; meta: { currentPage, itemCount, itemsPerPage, totalItems, totalPages?, hasNext } }
```

Defaults: `page=1`, `limit=10`.

## Referências

- [references/endpoints.md](references/endpoints.md) — cada endpoint: método, path, auth, params, retorno, comportamentos, erros.
- [references/glossary.md](references/glossary.md) — vocabulário de domínio Banky.
- `.agents/references/domain.md` — superfícies sensíveis e decisões vigentes.
- `.agents/references/conventions.md` — padrões de controller/service e validação de contrato.

## Manutenção

Atualizar esta skill quando:

- novo controller/rota ou mudança de DTO/status code;
- novo fluxo NLP/auto-review;
- correção de gap documentado (owner scoping, Zod em DTOs).

Versão da API no momento da última revisão: **1.4.3** (`package.json`). Total: **55 rotas HTTP** (54 versionadas + health).
