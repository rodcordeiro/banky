# Playbook operacional — Autoavaliador de feedbacks NLP

Guia para operar o autoavaliador sem confundir **ciclo de promoção** com **runtime efetivo** do avaliador.

## Premissas

- Feedback NLP: `pending` → revisão humana (`validated` / `corrected`) → lançamento é passo separado.
- Decisão do autoavaliador (`approve` / `correct` / `manual_review` / `reject`) ≠ `status` de negócio.
- `PromotionCandidate.active` **não** significa regra viva no avaliador até AUTO-034.
- Cron de **apply automático** permanece **desligado**.

## Modos

| Modo | O que faz | Como está hoje |
| --- | --- | --- |
| `shadow` | Avalia e grava histórico; não muda feedback | Cron ativo + `POST /nlp/auto-review/revaluate` |
| `assistive` | Sugere (ex.: aliases); humano decide | Alias suggestions + ciclo de promoção |
| `automatic` | Poderia aplicar approve/correct | Métodos existem; **sem cron**; não ligar sem gate |

## Ativar / operar shadow

1. Garantir API no ar com scheduler Nest habilitado.
2. Cron chama `revaluatePendingBatch` (pending, batch limitado, idempotente por `feedbackId + shadow + reviewVersion`).
3. Reavaliação manual (por owner):

```http
POST /api/v1/nlp/auto-review/revaluate
Authorization: Bearer <token>
Content-Type: application/json

{ "reviewVersion": "auto-review-shadow-v2", "batchSize": 100 }
```

4. Conferir contagens: `evaluated`, `skipped`, `errors`.
5. Relatório: `GET /api/v1/nlp/auto-review/report`
6. Métricas: `GET /api/v1/nlp/auto-review/quality-metrics`
7. Learning loop: `GET /api/v1/nlp/auto-review/learning-loop`
8. Reassessment (AUTO-028): `GET /api/v1/nlp/auto-review/learning-loop/reassessment`
9. Promotion policy reassessment (AUTO-029): `GET /api/v1/nlp/auto-review/learning-loop/promotion-policy-reassessment`

Bump de `reviewVersion` gera **nova** linha shadow; mesma versão faz skip.

## Ativar modo assistivo (aliases)

1. `GET /api/v1/nlp/auto-review/alias-suggestions?minVolume=2`
2. Revisar conflitos (`conflict=true` não promove).
3. Cron (ou manual) **só enche a fila de candidatos** — não aprova nem ativa runtime:
   - cron diário (prod `02:15`, dev a cada hora): elegíveis (`meetsMinimumVolume`, sem conflict/rejected/alreadyPromoted/rolled_back)
   - manual por owner: `POST /api/v1/nlp/auto-review/alias-suggestions/promote-eligible`
4. Promote pontual: `POST /api/v1/nlp/auto-review/alias-suggestions/promote` com `field`, `pattern`, `predicted`, `corrected`.
5. Ciclo existente:
   - listar: `GET /api/v1/nlp/auto-review/promotion-candidates`
   - rejeitar / aprovar / apply / rollback nos endpoints de promotion-candidates
6. Histórico de ciclo: `GET /api/v1/nlp/auto-review/promotion-history`

**Caminho feliz do AUTO-021 termina no candidato criado** (`promote`).  
Candidatos de alias nascem com `shadowAgreementRate=0`, então `POST .../approve` retorna **400** (`insufficient_agreement_rate` / amostras) até haver evidência shadow do próprio alias — isso é gate esperado, não bug.  
Após approve com gates ok: `POST .../apply` grava alias em `bk_tb_feedback_auto_review_effective_alias` (`runtimeEffective=true` no relatório) e **reprocessa a amostra em shadow** (`shadow-post-apply-...`; não muda status/corrected*).  
`POST .../rollback` com `kind=immediate|pause|expire` desativa runtime e reprocessa amostra em shadow (`shadow-post-rollback-...`); feedbacks/tx intactos.  
`GET .../effective-aliases` lista runtime. Estático `alias.rules.ts` continua como fallback.

## Política / workflow (032)

- Fila: `qualityPreview.workflowRecommendation` + risco.
- Approve excepcional: `decisionVsRecommendation=override` exige `reasonCode` + `exceptionalReason` (não fura gates de shadow).
- Expire: `POST .../expire` em `approved` sem apply.

## Modo automatico limitado (ainda NÃO ligar)

Métodos existem (`applyAutoReviewDecision` / `applyAutoReviewCorrection`) com guardrails:

- modo `automatic`, score alto, valor sob limite
- feedback `pending`, sem `corrected*` humano
- `applyAutoReviewCorrection` revalida entidade/alias (e valor > 0); falha → `semantic_revalidation_failed`
- bloqueio humano grava auditoria `applied=false` + `human_correction_present`

**Não** habilitar cron de apply sem:

1. métricas shadow×humano estáveis (`quality-metrics` / learning-loop)
2. auditoria de apply/bloqueio ok
3. playbook de desligar (esta seção)
4. política de promoção + rollback de ciclo
5. preferencialmente aliases/runtime (AUTO-034) se a autonomia depender de alias

## Desligar autoaprovacao

1. Confirmar que **não há** cron/job chamando `applyAutoReview*` (estado atual esperado).
2. Se alguém ligou apply em job custom: remover/desabilitar imediatamente.
3. Shadow pode continuar (só observa).
4. Candidatos `active` podem ser revertidos no ciclo (`POST .../rollback?kind=...`) — isso **desativa** aliases runtime ligados ao `candidateVersion` (feedbacks/tx intactos).
5. Feedbacks já `validated`/`corrected` e transações **não** são reescritos pelo rollback de promoção.

## Metricas a acompanhar

| Fonte | Olhar |
| --- | --- |
| `quality-metrics` | acordo shadow×humano, FP potencial (approve + humano corrected/pending), bloqueios por guardrail, `aliasInspectionReadiness` |
| `learning-loop` | `inspectionReady`, `promotionEvidence`, `promotionReadiness.eligible` |
| `learning-loop/reassessment` | cobertura, qualidade por fonte, promote≠validatedLearning, recommendations conservadoras |
| `learning-loop/promotion-policy-reassessment` | política v1 vs evidência; propostas por segmento; `applied=false`; auto-promoção off |
| `report` | divergências item a item |
| `alias-suggestions` | volume, conflitos, rejeitados |
| `promotion-candidates` | fila com `qualityPreview` (resumo, conflitos, cobertura) — ficha leve AUTO-030 |
| `promotion-candidates/:version` | ficha completa `qualitySignals` + `workflow` — `runtimeEffective` reflete alias DB ativo |
| `promotion-candidates/:version/comparative-replay` | crash-test por segmento: drift/split, FP por faixa, reco promote\|observe\|reject\|reduce_scope |
| `effective-aliases` | aliases runtime (DB) + fallback estático declarado |
| `promotion-history` | trilha do ciclo; `rollbackKind` quando houver |

Pergunta operacional: “o shadow está seguro o bastante para eu olhar candidatos de alias?” — responder com `quality-metrics` + `aliasInspectionReadiness`, não com feeling.

## Rollback

### Rollback de ciclo de promoção

1. `POST /api/v1/nlp/auto-review/promotion-candidates/:candidateVersion/rollback` com `reason`.
2. Status `active` → `rolled_back`.
3. Conferir `GET /api/v1/nlp/auto-review/promotion-history`.
4. Não altera feedbacks, `corrected*`, transações nem `alias.rules.ts`.

### Rollback “runtime” (AUTO-034)

1. `POST .../rollback` com `kind=immediate|pause|expire` e `reason`.
2. Alias DB → `inactive`/`paused`; ciclo → `rolled_back`.
3. Conferir `GET .../effective-aliases` e history.
4. Reprocess shadow da amostra afetada roda automaticamente no apply/rollback de alias (ainda sem mudar status/tx).

## Política de promoção (AUTO-029)

`GET .../promotion-policy-reassessment` compara evidência × política **v1**.  
Se `applied=false` (sempre hoje), **ignore** `proposedCriteria` como regra viva — é protocolo, não remédio.

## Criterios para aumentar autonomia

Só considerar aumentar autonomia se **todos** forem verdade:

1. Amostra humana+shadow suficiente (política alias: ≥20, acordo ≥0.98, FP confirmado = 0).
2. `promotionReadiness.eligible` ou evidência equivalente no learning loop.
3. Auditoria de apply/bloqueio consultável.
4. Playbook de desligar testado (kill switch claro).
5. Nenhuma auto-promoção; aprovador humano obrigatório.
6. Preferir reduzir revisão repetitiva via aliases assistidos antes de ligar apply em lote.

## Linguagem proibida no ops

- “IA aprovou o lançamento”
- “Alias ativo” para candidato só `active` no ciclo
- “Rollback desfez a regra no avaliador” sem checar `effective-aliases` / `runtimeEffective`
- “Pause retoma sozinha” (ciclo fica `rolled_back`; precisa novo fluxo)
