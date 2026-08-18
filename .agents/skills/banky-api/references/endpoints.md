# Endpoints — banky-api

*Contrato* HTTP. Prefixo `/api` + URI `v1` → `/api/v1`. Health: `/api/health`. Bootstrap: `.agents/references/runtime.md`.

Legenda: `[sem Zod]` = DTO sem schema Zod.

NLP e auto-review: [nlp.md](nlp.md).

## Índice

| Método | Path | Auth | Detalhe |
|--------|------|------|---------|
| POST | /api/v1/auth/login | LocalAuth | #auth |
| POST | /api/v1/auth/register | público | #auth |
| POST | /api/v1/auth/refresh | Reauth | #auth |
| GET | /api/v1/users | JWT | #users |
| GET | /api/v1/users/me | JWT | #users |
| GET/POST | /api/v1/accounts | JWT | #accounts |
| GET/PUT/DELETE | /api/v1/accounts/:id | JWT | #accounts |
| GET/POST | /api/v1/categories | JWT | #categories |
| GET/PUT/DELETE | /api/v1/categories/:id | JWT | #categories |
| GET | /api/v1/transactions | JWT | #transactions |
| GET | /api/v1/transactions/uncategorized | JWT | #transactions |
| GET/PUT/DELETE | /api/v1/transactions/:id | JWT | #transactions |
| POST | /api/v1/transactions | JWT | #transactions |
| POST | /api/v1/transactions/transfer | JWT | #transactions |
| POST | /api/v1/transactions/credit-payment | JWT | #transactions |
| GET/POST | /api/v1/payments | JWT | #payments |
| GET/PUT/DELETE | /api/v1/payments/:id | JWT | #payments |
| GET/POST/PUT/DELETE | /api/v1/parameters | JWT | #parameters |
| GET/POST/PUT/DELETE | /api/v1/parameters/values… | JWT | #parameters |
| GET | /api/health/ | público | #health |
| POST | /api/v1/nlp | JWT | [nlp.md](nlp.md) |
| GET | /api/v1/nlp/models | JWT | [nlp.md](nlp.md) |
| GET | /api/v1/nlp | JWT | [nlp.md](nlp.md) |
| POST | /api/v1/nlp/:id/review | JWT | [nlp.md](nlp.md) |
| POST | /api/v1/nlp/training | JWT | [nlp.md](nlp.md) |
| POST | /api/v1/nlp/:id/transaction | JWT | [nlp.md](nlp.md) |
| * | /api/v1/nlp/auto-review/… | JWT | [nlp.md](nlp.md) |

## Compartilhado

| Decorator | Credencial | Uso |
|-----------|------------|-----|
| `@LocalAuth()` | body `username`, `password` | login |
| `@Auth()` | `Authorization: Bearer <accessToken>` | rotas protegidas |
| `@Reauth()` | body `refreshToken` | refresh |

Login/refresh: `{ accessToken, expires, refreshToken, authenticated? }`. Access ~1 h; refresh ~5 dias.

Paginação (`GET /transactions`, `GET /nlp`, `GET /nlp/auto-review/report`): `{ items: T[]; meta: { currentPage, itemCount, itemsPerPage, totalItems, totalPages?, hasNext } }`. Defaults: `page=1`, `limit=10`.

Throttle: 10 req / 30 s. `ZodValidationPipe` nos DTOs Zod. Conflito DB → `409`. Entidades base: `{ id, createdAt, updatedAt }`.

---

## Auth

### POST /login

| | |
|---|---|
| Auth | `@LocalAuth()` — body `username`, `password` |
| Status | `200` |

**Body:** `{ username: string, password: string }`

**Retorno:**
```json
{ "accessToken": "...", "expires": "ISO", "refreshToken": "...", "authenticated": true }
```

**Comportamento:** valida credenciais (bcrypt), persiste refresh token no user, emite JWT access (~1 h) e refresh (~5 dias).

**Erros:** `401` credenciais inválidas; `409` conflito DB ao salvar token.

### POST /register

| | |
|---|---|
| Auth | público |
| Status | `200` |

**Body** `[sem Zod]`: `{ name: string, username: string, password: string }`

**Retorno:** `{ accessToken, expires, refreshToken }` (sem `authenticated`).

**Comportamento:** cria user; password hasheado em `@BeforeInsert`.

**Erros:** `400` erro no store; `409` username duplicado.

### POST /refresh

| | |
|---|---|
| Auth | `@Reauth()` — body `refreshToken` |
| Status | `200` |

**Body:** `{ refreshToken: string }` (Swagger documenta `login` mas strategy não usa).

**Retorno:** `{ accessToken, expires, refreshToken, authenticated: true }`

**Erros:** `401` refresh inválido/expirado.

---

## Users

Auth: JWT Bearer em todas.

### GET /

**Retorno:** `UsersEntity[]` — todos os usuários (sem filtro por owner).

### GET /me

**Retorno:** `UsersEntity` do user autenticado (`req.user.id`).

**Erros:** `400` user não encontrado.

---

## Accounts

Auth: JWT Bearer. Owner injetado em create/update.

**Shape:** `{ id, createdAt, updatedAt, name, ammount, threshold, paymentType, owner }`

### GET /

Contas do owner autenticado, com relação `owner`.

### GET /:id

Conta por id. **Sem verificação de ownership.**

**Erros:** `400` não encontrada.

### POST /

**Body (Zod):** `{ name, ammount, paymentType, threshold }` — todos required.

**Retorno:** entidade criada com `owner = req.user.id`.

### PUT /:id

**Body:** `Partial<CreateAccountDTO>` + owner forçado do JWT.

**Erros:** `400` id não encontrado.

### DELETE /:id

**Status:** `204` sem body.

---

## Categories

Auth: JWT Bearer.

**Shape:** `{ id, createdAt, updatedAt, name, positive, internal, classification?, owner, category?, subcategories[] }`

### GET /

Raízes (`category IS NULL`) do owner, com `subcategories`.

### GET /:id

Categoria por id. **Sem verificação de ownership.**

### POST /

**Body (Zod):**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | string | sim |
| positive | boolean | sim |
| classification | essencial \| importante \| opcional \| nao_controlavel | não |
| category | string (id pai) | não |
| internal | boolean | não |

### PUT /:id

**Body:** partial + owner do JWT.

### DELETE /:id

**Status:** `204`.

---

## Transactions

Auth: JWT Bearer. Rotas estáticas registradas antes de `/:id`.

**Shape:** `{ id, createdAt, updatedAt, description, date, value, batchId?, owner, category, account }`

### GET /

**Query (Zod):** `category?`, `lastUpdated?` (updatedAt > date), `limit?`, `page?`

**Retorno:** paginado, owner = JWT, ordenado `date DESC`, relações `account` e `category`.

### GET /uncategorized

Transações nas categorias desconhecidas (parâmetros `unknown_positive_category`, `unknown_negative_category`).

**Erros:** `400` parâmetros não configurados.

### GET /:id

Por id. **Sem verificação de ownership.**

### POST /

**Status:** `201`

**Body (Zod):** `{ description, account, category, date, value, id? }`

**Comportamento:** salva transação; atualiza saldo da conta: `ammount += value * (positive ? 1 : -1)`.

**Erros:** `501` falha genérica no store; `409` DB.

### PUT /:id

**Body:** partial + owner. **Não recalcula saldo.**

### DELETE /:id

**Status:** `204`. **Não reverte saldo.**

### POST /transfer

**Status:** `201`

**Body (Zod):** `{ description, origin, destiny, value, date? }` — date default = now ISO.

**Comportamento:** duas transações (mesmo `batchId`); categorias via parâmetros `transference_origin_category` e `transference_destiny_category`; debita origem, credita destino.

**Retorno:** corpo vazio (service retorna void).

**Erros:** `400` parâmetros ou contas não encontradas.

### POST /credit-payment

**Status:** `200`

**Body (Zod):** `{ origin, destiny, value, date? }`

**Comportamento:** uma transação `"Pagamento cartão de crédito"`; categoria via `credit_payment_category`; debita origem, credita cartão.

**Retorno:** `TransactionsEntity`.

---

## Payments

Auth: JWT Bearer. Catálogo global (sem owner).

**Shape:** `{ id, name, createdAt, updatedAt }`

| Método | Path | Body | Status |
|--------|------|------|--------|
| GET | / | — | 200 array |
| GET | /:id | — | 200 |
| POST | / | `{ name }` Zod | 200 |
| PUT | /:id | `{ name }` completo | 200 |
| DELETE | /:id | — | 204 |

---

## Parameters

Auth: JWT Bearer.

**Parameter:** `{ id, name, key, createdAt, updatedAt }`  
**Parameter value:** `{ id, value, owner, parameter, createdAt, updatedAt }`

### GET /

Todas as definições de parâmetro.

### GET /values

Valores do owner autenticado com relação `parameter`.

### GET /values/:id

**Path `id`:** id da **definição** de parâmetro (não do value). Retorna values daquele parâmetro + owner.

### GET /:id

Definição por id.

### POST /

**Body (Zod):** `{ name, key }`

### POST /values

**Body (Zod):** `{ parameter, value }` — owner do JWT.

### PUT /:id

**Body:** partial de parameter.

### PUT /values/:id

**Path:** id do **value**. Body partial.

### DELETE /:id | DELETE /values/:id

**Status:** `204`

---

## Health

### GET /

Auth: público. Path: `/api/health`.

**Retorno (Terminus):** `status`, `info.version.value` (espelha `package.json`), `info.memory_heap`, `info.memory_rss`.

**Limites:** heap ≤ 200 MB, RSS ≤ 3000 MB. Unhealthy → `503`.

---

## Erros comuns

| HTTP | Origem |
|------|--------|
| 400 | Zod, BadRequestException, entidade não encontrada |
| 401 | Guards Passport |
| 404 | NotFoundException (NLP) |
| 409 | Constraint DB (unique, FK) |
| 501 | Transaction store catch-all |
| 204 | DELETE bem-sucedido |

## Gaps conhecidos

1. E2E stub — não cobre endpoints reais.
2. *ownership* — `/:id` sem owner scoping em accounts, categories, transactions.
3. `GET /users` expõe todos os users.
4. DTOs auth/NLP sem Zod.
5. *orrected* em `ApproveFeedbackDto`.
6. `POST /transactions/transfer` retorna 201 com body vazio.
7. Throttle 10/30s pode limitar batch auto-review.
