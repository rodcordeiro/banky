# NLP — banky-api

*Contrato* de parse, feedback, treino e auto-review. Base: `/api/v1/nlp`. Auth: JWT Bearer em todas. Owner = `req.user.id`.

Leitura analítica com `runtimeEffective: false` até `apply` de candidato.

---

## Parse e feedback

### POST /

Parse de texto livre em feedback.

**Body** `[sem Zod]`: `{ text: string }`

**Retorno:** `FeedbackEntity` com campos predicted, `status: pending`, `usedForTraining: false`.

Intents: `create` | `transfer`.

### GET /models

Metadados dos classificadores (`intent`, `account`, `category`, `value`): exists, file, updatedAt, size, model.

### GET /

Lista feedbacks paginados do owner.

**Query** `[sem Zod]`: `status?`, `usedForTraining?`, `id?`, `lastUpdated?`, `page?` (default 1), `limit?` (default 10).

**Retorno:** paginado, ordenado `createdAt DESC`.

### POST /:id/review

Revisão humana.

**Body** `[sem Zod]` — *orrected* no JSON:

| Campo | Tipo |
|-------|------|
| status | pending \| validated \| corrected |
| correctedIntent, correctedAccount, correctedDestinyAccount, correctedValue, correctedDate | opcionais |
| orrectedOriginAccount, orrectedCategory | opcionais (nomes reais no JSON) |

**Regras:** `404` feedback não encontrado; `400` status inválido; `400` status=corrected sem campo corrigido.

### POST /training

**Query:** `{ fullTraining?: boolean }` default false.

**Comportamento:**
- `false`: feedbacks com `usedForTraining=false` e status ≠ pending.
- `true`: todos não-pending.
- Marca `usedForTraining=true` no incremental.

**Retorno:** void/undefined se nenhum elegível.

### POST /:id/transaction

Cria transação(ões) a partir de feedback revisado.

**Retorno:** transfer → `{ type: 'transfer', feedbackId }`; create → `TransactionsEntity`.

**Erros:** `404` feedback; `400` valor/conta/categoria inválidos.

---

## Auto-review

### GET /auto-review/report

**Query:** page, limit, mode (shadow|assistive|automatic), decision, minScore, maxScore, from, to, divergence, sortBy, order.

**Retorno:** `{ items: AutoReviewReportItem[], meta }` paginado.

### GET /auto-review/learning-loop

**Query:** `{ maxExamples?: number }` default 20.

**Retorno:** dataset, métricas por campo, confusões, divergências, evidência de promoção.

### GET /auto-review/learning-loop/reassessment

**Query:** from, to, baselineFrom, baselineTo, maxExamples.

**Retorno:** cobertura, qualidade por fonte, divergências recorrentes, janelas before/after.

### GET /auto-review/learning-loop/promotion-policy-reassessment

**Query:** from?, to?, valueApprovalLimit?

**Retorno:** versão de policy, segmentos, critérios propostos. Não aplica policy.

### GET /auto-review/quality-metrics

**Query:** from?, to?, valueApprovalLimit?

**Retorno:** summary, breakdowns por mode/decision/intent/field/value band, guardrails.

### POST /auto-review/revaluate

**Body:** `{ reviewVersion?, batchSize? }`

**Retorno:** `{ startedAt, finishedAt, reviewVersion, mode, batchSize, candidates, evaluated, skipped, errors, errorFeedbackIds }`

### GET /auto-review/alias-suggestions

**Query:** `{ minVolume?: number }` default 2.

**Retorno:** `{ generatedAt, minVolume, items[], runtimeEffective: false }`

### POST /auto-review/alias-suggestions/promote

**Body:** `{ field: 'account'|'category', pattern, predicted, corrected, minVolume? }`

**Retorno:** `FeedbackAutoReviewPromotionCandidateEntity`

**Erros:** sugestão não encontrada, conflito textual, volume insuficiente, já rejeitada.

### POST /auto-review/alias-suggestions/promote-eligible

**Query:** minVolume?

**Retorno:** batch com contadores e outcomes por item.

### GET /auto-review/promotion-candidates

**Query:** `{ status?: candidate|shadow_validated|approved|rejected|active|rolled_back }`

**Retorno:** lista enriquecida com preview de qualidade.

### GET /auto-review/promotion-history

**Query:** `{ candidateVersion?: string }`

**Retorno:** timeline de eventos.

### GET /auto-review/promotion-candidates/:candidateVersion

**Retorno:** detalhe completo + workflow hint.

**Erros:** `404`

### GET /auto-review/promotion-candidates/:candidateVersion/comparative-replay

**Query:** from?, to?, recentDays? (default 30), valueApprovalLimit?

**Retorno:** crash-test sombra — sample split, drift, métricas, recomendação.

### GET /auto-review/effective-aliases

**Retorno:** aliases ativos/inativos com `runtimeEffective`, versões, timestamps de ativação/desativação.

### POST /auto-review/promotion-candidates/:candidateVersion/approve

**Body:** `{ notes?, reasonCode?, decisionVsRecommendation?: agree|override, exceptionalReason? }`

**Comportamento:** status → `approved`. Exige estado candidate/shadow_validated; valida gates de replay; override exige reasonCode + exceptionalReason.

### POST /auto-review/promotion-candidates/:candidateVersion/expire

**Body:** action DTO (notes opcional).

**Comportamento:** approved não aplicado → rejected com nota expired.

### POST /auto-review/promotion-candidates/:candidateVersion/reject

**Body:** action DTO.

**Erros:** não rejeita active ou rolled_back.

### POST /auto-review/promotion-candidates/:candidateVersion/apply

**Body:** action DTO.

**Comportamento:** approved não expirado → active; ativa alias em runtime. Idempotente se já active.

### POST /auto-review/promotion-candidates/:candidateVersion/rollback

**Body:** `{ reason: string (required), notes?, kind?: immediate|pause|expire }`

**Comportamento:** desativa alias; status → rolled_back. Só active. Idempotente se já rolled_back.

Throttle global 10 req / 30 s pode limitar batch de auto-review.
