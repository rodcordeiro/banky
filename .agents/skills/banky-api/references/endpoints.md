# Endpoints — banky-api

Referência completa dos endpoints HTTP. Base path versionada: `/api/v1`. Health: `/api/health`.

Legenda: `[sem Zod]` = DTO sem schema Zod (validação incerta em runtime).

---

## Auth — `/api/v1/auth`

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

---

### POST /register

| | |
|---|---|
| Auth | público |
| Status | `200` |

**Body** `[sem Zod]`: `{ name: string, username: string, password: string }`

**Retorno:** `{ accessToken, expires, refreshToken }` (sem `authenticated`).

**Comportamento:** cria user; password hasheado em `@BeforeInsert`.

**Erros:** `400` erro no store; `409` username duplicado.

---

### POST /refresh

| | |
|---|---|
| Auth | `@Reauth()` — body `refreshToken` |
| Status | `200` |

**Body:** `{ refreshToken: string }` (Swagger documenta `login` mas strategy não usa).

**Retorno:** `{ accessToken, expires, refreshToken, authenticated: true }`

**Erros:** `401` refresh inválido/expirado.

---

## Users — `/api/v1/users`

Auth: JWT Bearer em todas.

### GET /

**Retorno:** `UsersEntity[]` — todos os usuários (sem filtro por owner).

### GET /me

**Retorno:** `UsersEntity` do user autenticado (`req.user.id`).

**Erros:** `400` user não encontrado.

---

## Accounts — `/api/v1/accounts`

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

## Categories — `/api/v1/categories`

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

## Transactions — `/api/v1/transactions`

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

## Payments — `/api/v1/payments`

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

## Parameters — `/api/v1/parameters`

Auth: JWT Bearer.

**Parameter:** `{ id, name, key, createdAt, updatedAt }`  
**Parameter value:** `{ id, value, owner, parameter, createdAt, updatedAt }`

### GET /

Todas as definições de parâmetro.

### GET /values

Valores do owner autenticado com relação `parameter`.

### GET /:id

Definição por id.

### GET /values/:id

**Path `id`:** id da **definição** de parâmetro (não do value). Retorna values daquele parâmetro + owner.

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

## Health — `/api/health`

### GET /

Auth: público.

**Retorno (Terminus):**
```json
{
  "status": "ok",
  "info": {
    "version": { "status": "up", "value": "1.4.3" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  },
  "details": { }
}
```

**Limites:** heap ≤ 200 MB, RSS ≤ 3000 MB. Unhealthy → `503`.

---

## NLP — `/api/v1/nlp`

Auth: JWT Bearer em todas.

### POST /

Parse de texto livre em feedback.

**Body** `[sem Zod]`: `{ text: string }`

**Retorno:** `FeedbackEntity` com campos predicted, `status: pending`, `usedForTraining: false`.

Intents: `create` | `transfer`.

---

### GET /models

Metadados dos classificadores (`intent`, `account`, `category`, `value`): exists, file, updatedAt, size, model.

---

### GET /

Lista feedbacks paginados do owner.

**Query** `[sem Zod]`: `status?`, `usedForTraining?`, `id?`, `lastUpdated?`, `page?` (default 1), `limit?` (default 10).

**Retorno:** paginado, ordenado `createdAt DESC`.

---

### POST /:id/review

Revisão humana.

**Body** `[sem Zod]` — atenção: typos no DTO (`orrectedOriginAccount`, `orrectedCategory`):

| Campo | Tipo |
|-------|------|
| status | pending \| validated \| corrected |
| correctedIntent, correctedAccount, correctedDestinyAccount, correctedValue, correctedDate | opcionais |
| orrectedOriginAccount, orrectedCategory | opcionais (nomes reais no JSON) |

**Regras:** `404` feedback não encontrado; `400` status inválido; `400` status=corrected sem campo corrigido.

---

### POST /training

**Query:** `{ fullTraining?: boolean }` default false.

**Comportamento:**
- `false`: feedbacks com `usedForTraining=false` e status ≠ pending.
- `true`: todos não-pending.
- Marca `usedForTraining=true` no incremental.

**Retorno:** void/undefined se nenhum elegível.

---

### POST /:id/transaction

Cria transação(ões) a partir de feedback revisado.

**Retorno:** transfer → `{ type: 'transfer', feedbackId }`; create → `TransactionsEntity`.

**Erros:** `404` feedback; `400` valor/conta/categoria inválidos.

---

## NLP Auto-Review

Todas exigem JWT. Owner = `req.user.id`. Leitura analítica com `runtimeEffective: false` salvo após `apply`.

### GET /auto-review/report

**Query:** page, limit, mode (shadow|assistive|automatic), decision, minScore, maxScore, from, to, divergence, sortBy, order.

**Retorno:** `{ items: AutoReviewReportItem[], meta }` paginado.

---

### GET /auto-review/learning-loop

**Query:** `{ maxExamples?: number }` default 20.

**Retorno:** dataset, métricas por campo, confusões, divergências, evidência de promoção.

---

### GET /auto-review/learning-loop/reassessment

**Query:** from, to, baselineFrom, baselineTo, maxExamples.

**Retorno:** cobertura, qualidade por fonte, divergências recorrentes, janelas before/after.

---

### GET /auto-review/learning-loop/promotion-policy-reassessment

**Query:** from?, to?, valueApprovalLimit?

**Retorno:** versão de policy, segmentos, critérios propostos. Não aplica policy.

---

### GET /auto-review/quality-metrics

**Query:** from?, to?, valueApprovalLimit?

**Retorno:** summary, breakdowns por mode/decision/intent/field/value band, guardrails.

---

### POST /auto-review/revaluate

**Body:** `{ reviewVersion?, batchSize? }`

**Retorno:** `{ startedAt, finishedAt, reviewVersion, mode, batchSize, candidates, evaluated, skipped, errors, errorFeedbackIds }`

---

### GET /auto-review/alias-suggestions

**Query:** `{ minVolume?: number }` default 2.

**Retorno:** `{ generatedAt, minVolume, items[], runtimeEffective: false }`

---

### POST /auto-review/alias-suggestions/promote

**Body:** `{ field: 'account'|'category', pattern, predicted, corrected, minVolume? }`

**Retorno:** `FeedbackAutoReviewPromotionCandidateEntity`

**Erros:** sugestão não encontrada, conflito textual, volume insuficiente, já rejeitada.

---

### POST /auto-review/alias-suggestions/promote-eligible

**Query:** minVolume?

**Retorno:** batch com contadores e outcomes por item.

---

### GET /auto-review/promotion-candidates

**Query:** `{ status?: candidate|shadow_validated|approved|rejected|active|rolled_back }`

**Retorno:** lista enriquecida com preview de qualidade.

---

### GET /auto-review/promotion-history

**Query:** `{ candidateVersion?: string }`

**Retorno:** timeline de eventos.

---

### GET /auto-review/promotion-candidates/:candidateVersion

**Retorno:** detalhe completo + workflow hint.

**Erros:** `404`

---

### GET /auto-review/promotion-candidates/:candidateVersion/comparative-replay

**Query:** from?, to?, recentDays? (default 30), valueApprovalLimit?

**Retorno:** crash-test sombra — sample split, drift, métricas, recomendação.

---

### GET /auto-review/effective-aliases

**Retorno:** aliases ativos/inativos com `runtimeEffective`, versões, timestamps de ativação/desativação.

---

### POST /auto-review/promotion-candidates/:candidateVersion/approve

**Body:** `{ notes?, reasonCode?, decisionVsRecommendation?: agree|override, exceptionalReason? }`

**Comportamento:** status → `approved`. Exige estado candidate/shadow_validated; valida gates de replay; override exige reasonCode + exceptionalReason.

---

### POST /auto-review/promotion-candidates/:candidateVersion/expire

**Body:** action DTO (notes opcional).

**Comportamento:** approved não aplicado → rejected com nota expired.

---

### POST /auto-review/promotion-candidates/:candidateVersion/reject

**Body:** action DTO.

**Erros:** não rejeita active ou rolled_back.

---

### POST /auto-review/promotion-candidates/:candidateVersion/apply

**Body:** action DTO.

**Comportamento:** approved não expirado → active; ativa alias em runtime. Idempotente se já active.

---

### POST /auto-review/promotion-candidates/:candidateVersion/rollback

**Body:** `{ reason: string (required), notes?, kind?: immediate|pause|expire }`

**Comportamento:** desativa alias; status → rolled_back. Só active. Idempotente se já rolled_back.

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

---

## Índice rápido

| Método | Path | Auth |
|--------|------|------|
| POST | /api/v1/auth/login | LocalAuth |
| POST | /api/v1/auth/register | público |
| POST | /api/v1/auth/refresh | Reauth |
| GET | /api/v1/users | JWT |
| GET | /api/v1/users/me | JWT |
| GET/POST | /api/v1/accounts | JWT |
| GET/PUT/DELETE | /api/v1/accounts/:id | JWT |
| GET/POST | /api/v1/categories | JWT |
| GET/PUT/DELETE | /api/v1/categories/:id | JWT |
| GET | /api/v1/transactions | JWT |
| GET | /api/v1/transactions/uncategorized | JWT |
| GET/PUT/DELETE | /api/v1/transactions/:id | JWT |
| POST | /api/v1/transactions | JWT |
| POST | /api/v1/transactions/transfer | JWT |
| POST | /api/v1/transactions/credit-payment | JWT |
| GET/POST | /api/v1/payments | JWT |
| GET/PUT/DELETE | /api/v1/payments/:id | JWT |
| GET/POST/PUT/DELETE | /api/v1/parameters[...] | JWT |
| GET/POST/PUT/DELETE | /api/v1/parameters/values[...] | JWT |
| GET | /api/health/ | público |
| POST | /api/v1/nlp | JWT |
| GET | /api/v1/nlp/models | JWT |
| GET | /api/v1/nlp | JWT |
| POST | /api/v1/nlp/:id/review | JWT |
| POST | /api/v1/nlp/training | JWT |
| POST | /api/v1/nlp/:id/transaction | JWT |
| GET | /api/v1/nlp/auto-review/* | JWT |
| POST | /api/v1/nlp/auto-review/* | JWT |

**Total:** 55 rotas (54 em `/api/v1` + health).

---

## Gaps conhecidos

1. E2E stub — não cobre endpoints reais.
2. Rotas `/:id` sem owner scoping em accounts, categories, transactions.
3. `GET /users` expõe todos os users.
4. DTOs auth/NLP sem Zod — validação incerta.
5. Typos em `ApproveFeedbackDto` (`orrected*`).
6. `POST /transactions/transfer` retorna 201 com body vazio.
7. Throttle global 10/30s pode limitar batch auto-review.
