# Backlog - Autoavaliador de feedbacks NLP

## Objetivo

Criar um fluxo progressivo para revisar feedbacks NLP e permitir aprovacao ou correcao autonoma com baixo risco operacional.

Como o resultado pode criar transacoes financeiras, a automacao deve comecar em modo auditavel, com limites claros, fallback para revisao manual e metricas antes de aprovar feedbacks sem intervencao humana.

## Recomendacao

Adotar um autoavaliador hibrido em 5 marcos:

1. Validacao deterministica e modelo de decisao.
2. Score de confianca e modo shadow.
3. Correcao assistida e aprovacao automatica limitada.
4. Operacao, auditoria e evolucao do avaliador.
5. Reavaliacao e aprimoramento do learning loop.

O primeiro release nao deve criar transacao automaticamente. Ele deve apenas classificar o feedback como aprovavel, corrigivel ou pendente de revisao. A aprovacao automatica deve entrar somente depois de medir precisao em modo shadow.

## Guardrails

- Nunca aprovar feedback com conta ou categoria inexistente para o owner.
- Nunca aprovar transferencia sem origem, destino, valor e contas distintas.
- Nunca aprovar valor ausente, zero, negativo ou nao numerico.
- Nunca aprovar data invalida ou fora da janela configurada.
- Nunca sobrescrever correcao humana existente.
- Sempre registrar decisao, score, razoes e versao do avaliador.
- Qualquer divergencia em campo critico deve cair para revisao manual.
- Aprovacao automatica deve ser reversivel e rastreavel.

## Modelo de decisao sugerido

Decisoes:

- `approve`: feedback pode ser aprovado sem correcao.
- `correct`: feedback tem correcao segura sugerida.
- `manual_review`: feedback precisa de revisao humana.
- `reject`: feedback nao tem dados suficientes ou viola regra critica.

Campos sugeridos para persistencia futura:

- `autoReviewDecision`
- `autoReviewScore`
- `autoReviewReasons`
- `autoReviewCorrections`
- `autoReviewedAt`
- `autoReviewVersion`
- `autoReviewMode`

## Tratamento das decisoes

A decisao do autoavaliador nao deve substituir diretamente o `status` do feedback. O `status` continua representando o estado de negocio do feedback:

- `pending`: aguardando revisao.
- `validated`: aprovado sem correcao.
- `corrected`: aprovado com correcao.

A decisao do autoavaliador deve ser registrada como uma avaliacao separada, com trilha auditavel. Isso evita misturar "o que o modelo sugeriu" com "o que foi efetivamente aplicado".

### Persistencia recomendada

Usar duas camadas:

1. Ultima decisao no proprio feedback, para filtro e operacao rapida.
2. Historico em tabela separada, para auditoria, comparacao shadow e investigacao.

Campos no `bk_tb_feedback`, quando houver migration planejada:

- `autoReviewDecision`: ultima decisao sugerida.
- `autoReviewScore`: score geral.
- `autoReviewMode`: `shadow`, `assistive` ou `automatic`.
- `autoReviewVersion`: versao das regras/modelo.
- `autoReviewedAt`: data da ultima avaliacao.

Tabela sugerida para historico: `bk_tb_feedback_auto_review`.

Campos sugeridos:

- `id`
- `feedbackId`
- `owner`
- `mode`
- `decision`
- `score`
- `fieldScores` como JSON
- `reasons` como JSON
- `suggestedCorrections` como JSON
- `applied`
- `appliedAt`
- `reviewVersion`
- `createdAt`

### Como a decisao e aplicada

O fluxo deve ter dois passos separados:

1. `evaluate`: calcula decisao, score, razoes e correcoes sugeridas.
2. `apply`: aplica a decisao somente se o modo e os guardrails permitirem.

Mapeamento sugerido:

- `approve` em modo automatico: altera `status` para `validated`, sem preencher `corrected*`.
- `correct` em modo automatico: preenche apenas campos corrigidos sugeridos e altera `status` para `corrected`.
- `manual_review`: resulta em `status` `pending`, mantendo o feedback na fila humana.
- `reject`: resulta em `status` `pending` e registra razao invalidante, sem descartar o feedback automaticamente.

No modo `shadow`, nenhuma decisao altera `status` ou `corrected*`; apenas registra a avaliacao no historico.

### Decisao sobre banco

Sim, as decisoes devem ser registradas em banco a partir do Marco 2, porque o modo shadow precisa de dados persistidos para comparar decisao automatica contra revisao humana. No Marco 1, a decisao pode existir apenas como retorno de service, sem migration, para manter a primeira entrega simples.

Para producao, a recomendacao e:

- Marco 1: sem alteracao de banco.
- Marco 2: criar historico `bk_tb_feedback_auto_review`.
- Marco 3: adicionar campos de ultima decisao no `bk_tb_feedback`, se a operacao precisar filtrar rapido.
- Marco 4: consolidar auditoria, metricas e rotina de retencao.
- Marco 5: reavaliar learning loop, politica de promocao, replay, aprovacao e rollback com dados reais de uso.

## Marco 1 - Base deterministica

Objetivo: criar a fundacao do autoavaliador sem autonomia real. Ao final, o sistema deve conseguir avaliar um feedback com regras deterministicas e explicar a decisao.

### Sprint 1

| ID       | Tarefa                            | Entrega                                                       | Criterio de aceite                                                         |
| -------- | --------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AUTO-001 | Definir contrato de decisao       | Interfaces/enums para decisao, razoes e correcao sugerida     | Implementado em `src/modules/nlp/interfaces/index.ts`                      |
| AUTO-002 | Mapear regras por intent          | Lista de regras para `create` e `transfer`                    | Implementado em `AUTO_REVIEW_INTENT_RULES`                                 |
| AUTO-003 | Criar `FeedbackAutoReviewService` | Service sem efeitos colaterais que recebe feedback e contexto | Implementado em `src/modules/nlp/services/feedback-auto-review.service.ts` |
| AUTO-004 | Validar entidades do owner        | Checagem de conta/categoria contra repositorios existentes    | Implementado em `NlpService.evaluateFeedbackAutoReview`                    |
| AUTO-005 | Testar validacoes criticas        | Testes unitarios das regras deterministicas                   | Casos de valor invalido, conta ausente e transferencia incompleta cobertos |

### Subtarefas

#### AUTO-001 - Definir contrato de decisao

- [x] Criar enum `AutoReviewDecision`.
- [x] Criar enum `AutoReviewMode`.
- [x] Criar tipo `AutoReviewReason`.
- [x] Criar tipo `AutoReviewFieldScores`.
- [x] Criar tipo `AutoReviewSuggestedCorrections`.
- [x] Criar interface `AutoReviewResult`.
- [x] Documentar mapeamento entre decisao e `FeedbackStatus`.

#### AUTO-002 - Mapear regras por intent

- [x] Listar campos obrigatorios para `create`.
- [x] Listar campos obrigatorios para `transfer`.
- [x] Definir invalidantes de valor.
- [x] Definir invalidantes de data.
- [x] Definir regra de origem e destino distintos.
- [x] Definir regra para conta/categoria ausente.
- [x] Documentar comportamento para intent desconhecida.

#### AUTO-003 - Criar `FeedbackAutoReviewService`

- [x] Criar service no modulo NLP.
- [x] Criar metodo `evaluate(feedback, owner)`.
- [x] Retornar sempre `AutoReviewResult`.
- [x] Nao salvar feedback no metodo `evaluate`.
- [x] Nao criar transacao.
- [x] Nao chamar treino de classificador.
- [x] Registrar testes para garantir ausencia de efeitos colaterais.

#### AUTO-004 - Validar entidades do owner

- [x] Buscar contas do owner uma vez.
- [x] Buscar categorias do owner uma vez.
- [x] Validar `predictedAccount` para `create`.
- [x] Validar `predictedCategory` para `create`.
- [x] Validar `predictedOriginAccount` para `transfer`.
- [x] Validar `predictedDestinyAccount` para `transfer`.
- [x] Retornar reason padronizada para entidade nao encontrada.

#### AUTO-005 - Testar validacoes criticas

- [x] Testar `create` valido.
- [x] Testar `create` sem conta.
- [x] Testar `create` sem categoria.
- [x] Testar `transfer` valida.
- [x] Testar `transfer` sem origem.
- [x] Testar `transfer` sem destino.
- [x] Testar transferencia com origem igual ao destino.
- [x] Testar valor zero, negativo e nao numerico.

### Passo a passo

1. Criar tipos internos para decisao e resultado de autoavaliacao.
2. Implementar regras puras, sem acesso direto a HTTP.
3. Injetar repositorios apenas para validar conta e categoria do owner.
4. Garantir que nenhuma regra cria transacao ou altera status.
5. Cobrir os cenarios invalidantes com testes unitarios.

### Riscos e limites

- Nao alterar contrato publico ainda.
- Nao criar migrations neste marco, salvo decisao explicita.
- Nao automatizar aprovacao enquanto nao houver metricas.

## Marco 2 - Confianca e modo shadow

Objetivo: medir a qualidade das decisoes automaticas sem mudar o fluxo real de aprovacao.

### Sprint 2

| ID        | Tarefa                                        | Entrega                                                                             | Criterio de aceite                                                           |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| AUTO-006  | Expor score por campo                         | Modelo interno com score para intent, conta, categoria, valor e data                | Resultado inclui score geral e score por campo                               |
| AUTO-007  | Definir thresholds iniciais                   | Configuracao de limites para aprovar, revisar ou rejeitar                           | Thresholds documentados e centralizados                                      |
| AUTO-008  | Implementar modo shadow                       | Job/service executa autoavaliacao sem alterar feedback                              | Decisao automatica pode ser consultada sem efeito colateral                  |
| AUTO-009  | Registrar razoes de decisao                   | Lista de reasons padronizadas                                                       | Cada decisao retorna pelo menos uma razao                                    |
| AUTO-010  | Criar relatorio operacional inicial           | Consulta ou endpoint interno para comparar decisoes shadow                          | Relatorio lista feedback, decisao, score e razoes                            |
| AUTO-022  | Criar learning loop supervisionado inicial    | Processo para transformar reviews humanos em melhoria mensuravel antes da autonomia | Divergencias geram dataset, ajuste e comparacao por versao                   |
| AUTO-023  | Definir politica de promocao do autoavaliador | Contrato de promocao para qualquer aprendizado candidato                            | Politica cobre alias, regra, threshold, modelo e politica operacional        |
| AUTO-024  | Criar modelo de candidato promovivel          | Estrutura comum para candidato, versao, origem, impacto e status                    | Todo candidato tem tipo, versao, evidencias, aprovador e rollback            |
| AUTO-025  | Executar replay/shadow comparativo            | Processo para comparar candidato contra versao atual                                | Relatorio mostra ganho, regressao, falsos positivos e divergencias por campo |
| AUTO-026A | Criar persistencia de candidatos de promocao  | Entidade, migration e provider para candidatos promoviveis                          | Candidato pode ser salvo e consultado por owner e versao                     |
| AUTO-026B | Criar workflow de aprovacao de promocao       | Fluxo para aprovar, rejeitar ou aplicar candidato                                   | Nenhum candidato vira ativo sem aprovacao ou criterio explicito              |
| AUTO-027  | Implementar rollback de promocao              | Procedimento para desativar candidato promovido                                     | Promocao aplicada pode ser revertida com trilha auditavel                    |

### Subtarefas

#### AUTO-006 - Expor score por campo

- [x] Criar modelo interno de score por campo.
- [x] Definir score default para match deterministico.
- [x] Definir score default para ausencia de classificacao.
- [x] Avaliar suporte de `natural` para ranking/classificacoes.
- [x] Expor score de intent.
- [x] Expor score de conta.
- [x] Expor score de categoria.
- [x] Expor score de valor/data por regra.

#### AUTO-007 - Definir thresholds iniciais

- [x] Criar constantes de threshold.
- [x] Definir threshold minimo para `approve`.
- [x] Definir threshold minimo para `correct`.
- [x] Definir faixa de `manual_review`.
- [x] Definir regras que sempre vencem score.
- [x] Documentar thresholds no backlog ou doc operacional.

Thresholds iniciais adotados:

- `approve`: `0.95`
- `correct`: `0.85`
- `manualReview`: `0.70`

#### AUTO-008 - Implementar modo shadow

- [x] Criar `AutoReviewMode.shadow`.
- [x] Criar metodo de execucao shadow para feedback pendente.
- [x] Garantir que shadow nao altera `status`.
- [x] Garantir que shadow nao altera `corrected*`.
- [x] Criar entidade ou provider para historico de avaliacao.
- [x] Persistir resultado shadow no historico.
- [x] Tornar execucao idempotente por feedback e versao, quando aplicavel.

Persistencia e cron adotados:

- tabela `bk_tb_feedback_auto_review`
- job em modo shadow com batch por feedbacks `pending`
- chave unica por `feedbackId + mode + reviewVersion`
- registro sem alteracao do feedback original

#### AUTO-009 - Registrar razoes de decisao

- [x] Criar catalogo de reason codes.
- [x] Separar reasons informativas de invalidantes.
- [x] Incluir campo afetado em cada reason.
- [x] Incluir mensagem tecnica curta.
- [x] Garantir pelo menos uma reason por resultado.
- [x] Cobrir reasons principais em teste.

#### AUTO-010 - Criar relatorio operacional inicial

- [x] Definir filtros: periodo, owner, decisao, modo e score.
- [x] Retornar feedbackId, texto, decisao, score e reasons.
- [x] Expor diferenca entre decisao shadow e status humano.
- [x] Ordenar por menor score ou divergencia.
- [x] Restringir acesso a usuario autenticado.
- [x] Documentar contrato caso vire endpoint.

Contrato adotado:

- endpoint autenticado `GET /nlp/auto-review/report`
- filtros por `mode`, `decision`, `minScore`, `maxScore`, `from`, `to`, `divergence`, `sortBy`, `order`, `page` e `limit`
- retorno com `feedbackId`, `originalText`, `decision`, `score`, `reasons`, `humanStatus`, `shadowStatus` e `divergent`

#### AUTO-022 - Criar learning loop supervisionado inicial

- [x] Definir fonte canonica de exemplos revisados: feedbacks com `status` diferente de `pending`.
- [x] Separar exemplos humanos de exemplos autoaprovados.
- [x] Usar `corrected*` como label preferencial quando existir; caso contrario, usar `predicted*` apenas para feedback humano validado.
- [x] Excluir feedback autoaprovado do treino automatico ate haver controle de qualidade explicito.
- [x] Criar dataset versionado para intent, conta, categoria e valor.
- [x] Medir acuracia por campo antes e depois de cada treino ou ajuste de regra.
- [x] Medir matriz de confusao de categorias mais divergentes.
- [x] Comparar versao anterior e nova versao do avaliador em modo shadow antes de promocao.
- [x] Promover novas regras, aliases ou modelos somente quando reduzir falso positivo sem aumentar risco operacional relevante.
- [x] Registrar versao, metricas, amostra usada, criterios de promocao e rollback.

Contrato sugerido:

- o aprendizado e supervisionado e auditavel;
- reviews humanos sao a principal fonte de verdade;
- divergencias recorrentes viram insumo para alias, regra, threshold ou treino;
- nenhuma melhoria aprendida aumenta autonomia automaticamente sem passar por shadow e criterios de promocao;
- o objetivo inicial e reduzir revisao manual repetitiva, nao eliminar revisao humana em casos ambiguos;
- Marco 3 nao deve habilitar `apply` automatico antes de existir evidencia minima do learning loop.

Contrato implementado:

- endpoint autenticado `GET /nlp/auto-review/learning-loop`;
- relatorio somente leitura, sem aplicar treino, alias, regra ou autonomia;
- retorno com `dataset`, `fieldMetrics`, `categoryConfusions`, `divergenceExamples`, `shadowVersionComparisons`, `inspectionReady`, `promotionEvidence` e `promotionReadiness`;
- `inspectionReady` indica amostra minima para inspecionar divergencias;
- `promotionReadiness.eligible` usa a politica de alias (`minShadowSamples`, `minAgreementRate`, `maxFalsePositiveRate`) e exige `rollbackRequired`;
- `eligible=true` libera apenas o aprovador humano — nao autoativa runtime, nao altera `status` e nao cria lancamento;
- `promotionEvidence` expoe versao, amostra, metricas, criterios aplicados e exigencia de rollback sem persistir no GET.

#### AUTO-023 - Definir politica de promocao do autoavaliador

- [x] Definir tipos promoviveis: `alias`, `rule`, `threshold`, `model` e `operational_policy`.
- [x] Definir status do ciclo: `candidate`, `shadow_validated`, `approved`, `rejected`, `active`, `rolled_back`.
- [x] Definir criterios minimos por tipo de candidato.
- [x] Exigir comparacao contra versao atual antes de ativar.
- [x] Exigir medicao de falso positivo, falso negativo, divergencia por campo e impacto operacional.
- [x] Definir limites que bloqueiam promocao automaticamente.
- [x] Exigir aprovador ou criterio explicito de auto-promocao previamente aprovado.
- [x] Definir retencao de evidencias e historico de decisoes.

Contrato sugerido:

- politica de promocao e transversal, nao restrita a aliases;
- nenhuma melhoria aprendida entra em producao apenas por existir no learning loop;
- toda promocao deve ter versao candidata, evidencias, criterio de aceite e rollback;
- auto-promocao, se existir no futuro, deve ser habilitada por politica especifica e auditavel.

Contrato implementado:

- politica tipada em `AUTO_REVIEW_PROMOTION_POLICY`;
- tipos promoviveis em `AutoReviewPromotionCandidateType`;
- status do ciclo em `AutoReviewPromotionStatus`;
- criterios conservadores por tipo em `criteriaByType`;
- auto-promocao desabilitada para todos os tipos;
- bloqueios explicitos para ausencia de shadow, rollback, aprovador e regressao critica.

#### AUTO-024 - Criar modelo de candidato promovivel

- [x] Criar contrato comum para candidato de aprendizado.
- [x] Registrar tipo do candidato.
- [x] Registrar origem: divergencia humana, shadow, metrica, alias sugerido, treino ou ajuste manual.
- [x] Registrar `candidateVersion` e versao base comparada.
- [x] Registrar evidencias agregadas e exemplos.
- [x] Registrar impacto esperado.
- [x] Registrar risco conhecido.
- [x] Registrar status, responsavel, aprovador, datas e observacoes.

Contrato implementado:

- modelo tipado em `AutoReviewPromotionCandidate`;
- origem em `AutoReviewPromotionCandidateOrigin`;
- evidencias em `AutoReviewPromotionCandidateEvidence`;
- impacto esperado em `AutoReviewPromotionCandidateImpact`;
- risco conhecido em `AutoReviewPromotionCandidateRisk`;
- rollback em `AutoReviewPromotionRollbackPlan`.

#### AUTO-025 - Executar replay/shadow comparativo

- [x] Rodar candidato contra amostra historica validada.
- [x] Comparar candidato contra versao atual do avaliador.
- [x] Medir acuracia por campo.
- [x] Medir matriz de confusao antes/depois.
- [x] Medir divergencia entre decisao candidata e decisao humana.
- [x] Identificar regressao por categoria, conta, intent e faixa de valor.
- [x] Bloquear promocao quando houver regressao acima do limite definido.
- [x] Gerar relatorio de promocao rastreavel.

Contrato implementado:

- relatorio tipado em `AutoReviewPromotionReplayResult`;
- recomendacao em `AutoReviewPromotionReplayRecommendation`;
- comparacao deterministica em `buildAutoReviewPromotionReplayResult`;
- bloqueio por amostra shadow insuficiente, acordo abaixo do minimo, falso positivo, regressao e ausencia de rollback;
- retorno com versao candidata, versao base, criterios aplicados, taxas, divergencias por campo, blockers e elegibilidade.

#### AUTO-026A - Criar persistencia de candidatos de promocao

- [x] Criar entidade de candidato de promocao.
- [x] Criar migration da tabela de candidatos.
- [x] Registrar provider/repository no modulo NLP.
- [x] Criar service minimo para salvar candidato.
- [x] Criar consulta por owner, status e versao candidata.
- [x] Garantir idempotencia por `owner + candidateVersion`.
- [x] Persistir evidencia, impacto, risco, rollback e metadados de ciclo.

Contrato implementado:

- tabela `bk_tb_feedback_auto_review_promotion_candidate`;
- entidade `FeedbackAutoReviewPromotionCandidateEntity`;
- provider `FEEDBACK_AUTO_REVIEW_PROMOTION_CANDIDATE_REPOSITORY`;
- service `FeedbackAutoReviewPromotionService`;
- chave unica por `owner + candidateVersion`.

#### AUTO-026B - Criar workflow de aprovacao de promocao

- [x] Permitir aprovar candidato.
- [x] Permitir rejeitar candidato com motivo.
- [x] Permitir aplicar candidato aprovado.
- [x] Impedir aprovacao de candidato sem evidencias minimas.
- [x] Registrar usuario da aprovacao, rejeicao e aplicacao.
- [x] Expor status atual dos candidatos.
- [x] Registrar versao base/anterior e nova versao no registro persistido.
- [x] Garantir idempotencia de aplicacao.

Entregue em `src/modules/nlp/services/feedback-auto-review-promotion.service.ts`
e `src/modules/nlp/controllers/nlp.controller.ts`. A aplicacao muda o status
persistido para `active`, mas ainda nao altera regras runtime do avaliador. Uma
trilha historica dedicada permanece no escopo de `AUTO-017`, e rollback fica em
`AUTO-027`.

#### AUTO-027 - Implementar rollback de promocao

- [x] Registrar plano de rollback no candidato.
- [x] Permitir desativar candidato promovido.
- [x] Restaurar status operacional para `rolled_back` quando aplicavel.
- [x] Registrar motivo do rollback.
- [x] Garantir que rollback nao altera feedbacks ja revisados sem decisao explicita.
- [x] Cobrir regras de rollback do service com teste unitario.
- [x] Expor historico dedicado de promocao e rollback.
- [x] Reprocessar amostra em shadow apos rollback runtime efetivo (depende de AUTO-034).

Contrato implementado:

- rollback de ciclo: `active` -> `rolled_back` com usuario, data e motivo;
- endpoint autenticado `GET /nlp/auto-review/promotion-history` (filtro opcional `candidateVersion`);
- historico reconstruido a partir dos campos de auditoria do candidato;
- cada evento marca `runtimeEffective=false` enquanto aliases nao forem efetivos no avaliador;
- apos apply/rollback de alias, `revaluateAffectedSample` grava shadow com `reviewVersion=shadow-post-{apply|rollback}-...` (sem mudar status/corrected*).

Entregue em `src/modules/nlp/services/feedback-auto-review-promotion.service.ts`
e `src/modules/nlp/controllers/nlp.controller.ts`.

### Passo a passo

1. Adaptar classificadores para expor sinal de confianca quando disponivel.
2. Calcular score geral a partir dos campos criticos.
3. Criar thresholds conservadores.
4. Rodar avaliador em modo shadow para feedbacks pendentes.
5. Comparar resultado automatico com revisao humana posterior.
6. Alimentar o learning loop com divergencias humanas revisadas.
7. Comparar versoes em shadow antes de liberar autoaprovacao ou autocorrecao.
8. Definir politica, candidato, replay, aprovacao e rollback antes de permitir promocao de aprendizado.

### Riscos e limites

- Score do Naive Bayes nao deve ser tratado como probabilidade calibrada.
- Threshold inicial deve priorizar falso negativo, nao falso positivo.
- Modo shadow nao deve alterar `status`, `corrected*` ou criar transacao.
- Sem learning loop, politica de promocao, replay/shadow comparativo e rollback, Marco 3 nao deve aplicar aprovacoes ou correcoes automaticamente.

## Marco 3 - Correcao assistida e aprovacao limitada

Objetivo: permitir que o avaliador sugira correcoes seguras e aprove automaticamente apenas casos de baixo risco, depois de validar o learning loop supervisionado do Marco 2.

### Sprint 3

| ID       | Tarefa                                  | Entrega                                                                  | Criterio de aceite                                           |
| -------- | --------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| AUTO-011 | Sugerir correcao por alias              | Correcao segura para categorias/contas conhecidas                        | Alias conhecido gera `correct` com razao auditavel           |
| AUTO-012 | Aplicar limites por valor               | Configuracao de valor maximo para aprovacao automatica                   | Valores acima do limite caem em `manual_review`              |
| AUTO-013 | Criar fluxo de autoaprovacao controlada | Metodo separado para aplicar decisao `approve`                           | Apenas feedback elegivel altera status                       |
| AUTO-014 | Criar fluxo de autocorrecao controlada  | Metodo separado para aplicar decisao `correct`                           | Correcao salva somente campos sugeridos com score suficiente |
| AUTO-015 | Testar nao sobrescrita humana           | Testes garantindo que campos corrigidos manualmente nao sao sobrescritos | Feedback com correcao humana permanece intocado              |

### Subtarefas

#### AUTO-011 - Sugerir correcao por alias

- [x] Reutilizar aliases de conta existentes.
- [x] Reutilizar aliases de categoria existentes.
- [x] Identificar divergencia entre predito e alias deterministico.
- [x] Gerar `suggestedCorrections`.
- [x] Gerar reason de correcao por alias.
- [x] Nao sugerir correcao se entidade nao existir para o owner.
- [x] Cobrir alias conhecido e alias inexistente em teste.

Contrato adotado:

- aliases de conta e categoria sao buscados no texto original do feedback;
- quando o alias resolve uma entidade existente do owner, o autoavaliador sugere a correcao e retorna `correct`;
- se o owner nao possui a entidade alvo, a sugestao nao e criada e o feedback continua em revisao humana;
- reasons sao registradas com `alias_correction_suggested` e campo afetado.

#### AUTO-012 - Aplicar limites por valor

- [x] Definir limite maximo por configuracao.
- [x] Definir limite default conservador.
- [x] Bloquear autoaprovacao acima do limite.
- [x] Permitir shadow acima do limite.
- [x] Registrar reason de valor acima do limite.
- [x] Testar limite abaixo, igual e acima.

Contrato adotado:

- limite default conservador de `100`;
- valores `<= 100` podem seguir para aprovacao automatica, se os demais guardrails passarem;
- valores acima do limite geram reason `value_above_limit` e caem em `manual_review`;
- o limite pode ser sobrescrito por `valueApprovalLimit` no contexto de avaliacao, se necessario;
- modo `shadow` continua avaliando normalmente para fins de auditoria e comparacao.

#### AUTO-013 - Criar fluxo de autoaprovacao controlada

- [x] Criar metodo `applyAutoReviewDecision`.
- [x] Exigir decisao `approve`.
- [x] Exigir modo `automatic`.
- [x] Revalidar guardrails antes de salvar.
- [x] Alterar status para `validated`.
- [x] Registrar historico como `applied`.
- [x] Nao criar transacao neste metodo.
- [x] Testar idempotencia.

Contrato adotado:

- `applyAutoReviewDecision` recebe feedback e avaliacao ja calculada;
- a aplicacao so ocorre quando a avaliacao e `approve` em modo `automatic`;
- o feedback precisa estar em `pending` e sem correcao humana existente;
- a aplicacao altera apenas `status` para `validated`;
- o historico automatico e persistido com `applied=true` e `appliedAt`;
- chamadas repetidas para a mesma combinacao de `feedbackId + mode + reviewVersion` nao reaplicam a decisao.

#### AUTO-014 - Criar fluxo de autocorrecao controlada

- [x] Criar metodo `applyAutoReviewCorrection`.
- [x] Exigir decisao `correct`.
- [x] Exigir modo `automatic`.
- [x] Preencher somente `corrected*` sugeridos.
- [x] Alterar status para `corrected`.
- [x] Registrar historico como `applied`.
- [x] Nao criar transacao neste metodo.
- [x] Bloquear sobrescrita de correcao humana existente.
- [x] Testar aplicacao, idempotencia e bloqueio por correcao humana.
- [x] Revalidar semanticamente cada campo sugerido contra alias/regra promovida.
- [x] Testar correcao segura por conta, categoria e valor separadamente.

Contrato adotado:

- `applyAutoReviewCorrection` recebe feedback e avaliacao ja calculada;
- a aplicacao so ocorre quando a avaliacao e `correct` em modo `automatic`;
- o feedback precisa estar em `pending` e sem correcao humana existente;
- a aplicacao altera apenas campos `corrected*` presentes em `suggestedCorrections` e muda `status` para `corrected`;
- o historico automatico e persistido com `applied=true` e `appliedAt`;
- chamadas repetidas para a mesma combinacao de `feedbackId + mode + reviewVersion` nao reaplicam a correcao;
- `applyAutoReviewCorrection` revalida entidades do owner + inconsistencia com alias efetivo; valor precisa ser finito e > 0; score >= threshold `correct`; blocker impede apply.

#### AUTO-015 - Testar nao sobrescrita humana

- [x] Criar fixture com `status=corrected`.
- [x] Criar fixture com `correctedAccount`.
- [x] Criar fixture com `correctedCategory`.
- [x] Criar fixture com `correctedValue`.
- [x] Garantir que apply nao sobrescreve campo corrigido.
- [x] Garantir que historico registra bloqueio por correcao humana.

Contrato adotado:

- `applyAutoReviewCorrection` nao altera feedback que ja esta `corrected`;
- qualquer campo `corrected*` ja preenchido bloqueia nova autocorrecao;
- bloqueio por correcao humana persiste em `bk_tb_feedback_auto_review` com `applied=false`, `appliedAt=null` e reason `human_correction_present`;
- o mesmo bloqueio e registrado ao tentar autoaprovacao com correcao humana presente.

### Passo a passo

1. Reutilizar aliases e matching deterministico ja existentes no NLP.
2. Definir campos que podem ser corrigidos automaticamente por regra.
3. Separar avaliar de aplicar decisao.
4. Aplicar decisao apenas quando todas as regras criticas passarem.
5. Registrar auditoria de cada aplicacao.

### Riscos e limites

- Este marco altera estado do feedback; exige rollback claro.
- Autoaprovacao nao deve criar transacao no mesmo passo sem decisao explicita.
- Caso haja divergencia entre predicao, alias e score, cair para revisao manual.

## Marco 4 - Operacao e evolucao

Objetivo: transformar o autoavaliador em um fluxo operavel, mensuravel e evolutivo.

### Sprint 4

| ID       | Tarefa                                   | Entrega                                                        | Criterio de aceite                                    |
| -------- | ---------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| AUTO-016 | Criar metricas de qualidade              | Contadores de aprovacao, correcao, revisao e erro              | Metricas separadas por decisao e intent               |
| AUTO-017 | Criar trilha de auditoria                | Registro de versao, razoes, score e alteracoes aplicadas       | Cada decisao aplicada e rastreavel                    |
| AUTO-018 | Definir rotina de reavaliacao            | Job para reprocessar feedbacks pendentes elegiveis             | Reprocessamento e idempotente                         |
| AUTO-019 | Criar criterios para LLM judge opcional  | Documento com quando usar ou nao usar judge externo            | LLM restrito a casos ambiguos e sem autonomia direta  |
| AUTO-020 | Consolidar playbook operacional          | Passo a passo para ativar, monitorar e desligar autoaprovacao  | Operador consegue habilitar/desabilitar com seguranca |
| AUTO-021 | Sugerir aliases a partir de divergencias | Relatorio assistido de aliases candidatos para conta/categoria | Sugestoes exigem revisao humana antes de virar regra  |

### Subtarefas

#### AUTO-016 - Criar metricas de qualidade

- [x] Contar decisoes por modo.
- [x] Contar decisoes por intent.
- [x] Contar aplicacoes automaticas.
- [x] Contar bloqueios por guardrail.
- [x] Medir divergencia entre shadow e revisao humana.
- [x] Medir taxa de falso positivo conhecida.
- [x] Expor metricas por endpoint interno autenticado.
- [ ] Expor metricas por log estruturado.

Contrato implementado (fatia inicial):

- endpoint autenticado `GET /nlp/auto-review/quality-metrics`;
- filtros `from`, `to` e `valueApprovalLimit`;
- retorno somente leitura com `summary`, `byMode`, `byDecision`, `byIntent`, `byField`, `byValueBand`, `guardrailBlocksByCode` e `aliasInspectionReadiness`;
- falso positivo potencial = shadow `approve` com feedback humano `corrected` ou ainda `pending`;
- nao altera `status`, `corrected*`, promocao nem runtime.

#### AUTO-017 - Criar trilha de auditoria

- [x] Persistir versao do avaliador.
- [x] Persistir reasons completas.
- [x] Persistir correcoes sugeridas.
- [x] Persistir snapshot dos scores.
- [x] Persistir usuario/origem quando aplicavel (ciclo de promocao separado).
- [x] Registrar quando decisao foi aplicada (`applied=true`).
- [x] Registrar quando decisao foi bloqueada (`applied=false` + `human_correction_present`).

Contrato implementado:

- reutiliza `bk_tb_feedback_auto_review` sem migration;
- aplicacao grava `applied=true` e `appliedAt`;
- bloqueio por correcao humana grava `applied=false`, `appliedAt=null` e reason `human_correction_present`;
- feedback permanece inalterado no bloqueio;
- consulta por `feedbackId` + `reviewVersion` distingue blocked vs applied via `applied` + reason code.

#### AUTO-018 - Definir rotina de reavaliacao

- [x] Selecionar feedbacks pendentes elegiveis.
- [x] Ignorar feedbacks ja avaliados na mesma versao.
- [x] Limitar volume por execucao.
- [x] Registrar inicio/fim da rotina.
- [x] Tratar erro por feedback sem interromper lote inteiro.
- [x] Garantir reprocessamento idempotente.

Contrato implementado:

- metodo `revaluatePendingBatch` (cron shadow passa a usa-lo);
- endpoint autenticado `POST /nlp/auto-review/revaluate` com `reviewVersion` e `batchSize` opcionais, escopo por owner;
- bump de versao cria nova linha shadow; mesma versao faz skip;
- retorno com `startedAt`, `finishedAt`, `candidates`, `evaluated`, `skipped`, `errors` e `errorFeedbackIds`;
- nao altera `status`/`corrected*` e nao aplica approve/correct.

#### AUTO-019 - Criar criterios para LLM judge opcional

- Definir quais dados podem ser enviados.
- Definir campos proibidos/sensiveis.
- Definir prompt/schema de resposta.
- Exigir JSON estrito.
- Restringir LLM a modo shadow ou assistivo.
- Definir threshold minimo para aceitar sugestao.
- Documentar custo e risco operacional.

#### AUTO-020 - Consolidar playbook operacional

- [x] Documentar como ativar modo shadow.
- [x] Documentar como ativar modo assistivo.
- [x] Documentar como ativar modo automatico limitado.
- [x] Documentar como desligar autoaprovacao.
- [x] Documentar metricas que devem ser acompanhadas.
- [x] Documentar procedimento de rollback.
- [x] Documentar criterios para aumentar autonomia.

Contrato implementado:

- playbook em `docs/feedback-auto-review-playbook.md`;
- deixa explicito que `PromotionCandidate.active` != runtime efetivo ate AUTO-034;
- cron de apply permanece desligado por padrao.

#### AUTO-021 - Sugerir aliases a partir de divergencias

- [x] Identificar feedbacks em que `predictedCategory` ou `predictedAccount` diverge do campo `corrected*`.
- [x] Agrupar divergencias por texto normalizado, entidade predita, entidade corrigida e owner.
- [x] Calcular frequencia, recencia e taxa de recorrencia da mesma correcao.
- [x] Gerar candidatos de alias somente quando houver volume minimo configurado.
- [x] Exibir exemplos de textos reais que sustentam a sugestao.
- [x] Bloquear sugestao quando houver conflito entre categorias ou contas diferentes para o mesmo padrao textual.
- [x] Marcar sugestoes como ciclo de promocao (`candidate`/`approved`/`rejected`/`active`/`rolled_back`).
- [x] Aplicar alias somente apos aprovacao humana explicita no ciclo (runtime efetivo permanece AUTO-034).
- [x] Registrar auditoria com origem da sugestao via candidato de promocao.
- [x] Reprocessar em modo shadow os feedbacks afetados antes de permitir uso automatico do novo alias (AUTO-034).

Contrato implementado:

- endpoint autenticado `GET /nlp/auto-review/alias-suggestions`;
- endpoint autenticado `POST /nlp/auto-review/alias-suggestions/promote` cria `PromotionCandidate` tipo `alias`;
- retorno somente leitura com conflitos, volume minimo e `runtimeEffective=false`;
- evidence.examples carrega `feedbackId` quando disponivel;
- apply/rollback de alias dispara reprocess shadow da amostra (`sampleShadow=...` nas notes);
- nao escreve `alias.rules.ts` no promote (runtime so via apply AUTO-034).

### Passo a passo

1. Medir decisoes antes de ampliar autonomia.
2. Expor metricas por modo: shadow, assistido e automatico.
3. Criar auditoria suficiente para explicar cada status alterado.
4. Usar divergencias recorrentes para sugerir aliases, regras e datasets de treino.
5. Comparar versoes em shadow antes de promover autonomia.
6. Definir processo de rollback operacional.
7. Avaliar uso de LLM apenas depois de conhecer os erros recorrentes.

### Riscos e limites

- Sem metricas, nao aumentar autonomia.
- LLM nao deve receber dados sensiveis desnecessarios.
- LLM nao deve aplicar decisao sozinho; no maximo sugere `manual_review` ou correcao assistida.

## Marco 5 - Reavaliacao e aprimoramento do learning loop

Objetivo: revisar a efetividade do learning loop ja promovivel no Marco 2, identificar regressoes ou lacunas reais de producao e aprimorar o processo de aprendizado sem aumentar autonomia sem evidencia.

### Sprint 5

| ID       | Tarefa                                          | Entrega                                                                               | Criterio de aceite                                                                |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AUTO-028 | Reavaliar learning loop supervisionado          | Revisao do processo de aprendizado com base em reviews reais, divergencias e metricas | Learning loop revisado evidencia cobertura, qualidade, lacunas e proximos ajustes |
| AUTO-029 | Reavaliar politica de promocao do autoavaliador | Revisao dos criterios de promocao com base em dados reais                             | Politica revisada cobre novos riscos, limites e excecoes observadas               |
| AUTO-030 | Aprimorar modelo de candidato promovivel        | Evolucao do contrato de candidato com novos sinais e evidencias                       | Candidato registra qualidade, cobertura, impacto e custo operacional              |
| AUTO-031 | Aprimorar replay/shadow comparativo             | Replay mais robusto para comparar candidatos e versoes                                | Relatorio evidencia ganho, regressao, drift e risco por segmento                  |
| AUTO-032 | Aprimorar workflow de aprovacao de promocao     | Fluxo revisado para decisao, aprovacao e observacao pos-promocao                      | Promocoes tem acompanhamento, validade e criterios de reversao                    |
| AUTO-033 | Aprimorar rollback e despromocao                | Procedimento para rollback, pausa e expiracao de aprendizado promovido                | Aprendizado pode ser pausado, revertido ou expirado com auditoria                 |
| AUTO-034 | Persistir aliases e ativar promocao no runtime  | Aliases deixam de depender de arquivo estatico e passam a ser carregados do banco     | Alias aprovado e aplicado passa a afetar o avaliador sem edicao manual de codigo  |

### Subtarefas

#### AUTO-028 - Reavaliar learning loop supervisionado

- [x] Revisar volume, recencia e representatividade dos feedbacks humanos revisados.
- [x] Separar qualidade por fonte: revisao humana, shadow, assistivo e automatico limitado.
- [x] Medir cobertura por intent, categoria, conta, faixa de valor e owner quando aplicavel.
- [x] Identificar divergencias recorrentes que ainda nao viraram alias, regra, threshold ou treino candidato.
- [x] Comparar metricas antes/depois das primeiras iteracoes do learning loop.
- [x] Identificar lacunas de label, vieses de amostra e campos com baixa confianca.
- [x] Atualizar criterios de entrada do dataset e exclusao de exemplos de risco.
- [x] Gerar recomendacao de proximos ajustes sem aumentar autonomia automaticamente.

Contrato implementado:

- endpoint autenticado `GET /nlp/auto-review/learning-loop/reassessment`;
- `runtimeEffective=false` fixo; recommendations nunca aumentam autonomia;
- `promotionVsLearning` separa promote/candidatos de `validatedLearning`;
- `aliasEffectivePromotionEligible` falso quando shadow do alias ausente/`shadowAgreementRate=0`;
- sinais `inspectionReady` / `promotionEvidence` / `promotionReadiness.eligible` permanecem distintos.

#### AUTO-029 - Reavaliar politica de promocao do autoavaliador

- [x] Revisar criterios minimos apos volume real de shadow, assistivo e automatico limitado.
- [x] Identificar limites muito permissivos ou restritivos.
- [x] Revisar bloqueios automaticos por falso positivo, regressao e impacto financeiro.
- [x] Definir criterios por segmento: intent, categoria, conta, faixa de valor e owner quando aplicavel.
- [x] Revisar se algum tipo de candidato pode ter auto-promocao com politica explicita.
- [x] Documentar excecoes que continuam exigindo revisao humana.
- [x] Atualizar retencao de evidencias quando houver novos requisitos operacionais.

Contrato implementado:

- endpoint autenticado `GET /nlp/auto-review/learning-loop/promotion-policy-reassessment`;
- `policyVersion=v1` (viva) + `proposalVersion=v1.1-proposal` (somente leitura);
- `runtimeEffective=false` e `applied=false` fixos; `allowsAutoPromotion=false`;
- `keepGlobalCriteria=true` — nao muta `AUTO_REVIEW_PROMOTION_POLICY`;
- elegibilidade operacional exclui `above_limit` (`humanExceptions.above_limit_excluded`);
- segmentos: `transfer` pode `meets_current`; `create` permanece restritivo; `within_limit` documenta FP residual.

#### AUTO-030 - Aprimorar modelo de candidato promovivel

- [x] Adicionar sinais de cobertura do dataset.
- [x] Adicionar confianca por segmento e nao apenas score global.
- [x] Registrar custo operacional esperado: volume reduzido de revisao, taxa de rejeicao e volume de rollback.
- [x] Registrar validade temporal do candidato quando houver drift de comportamento.
- [x] Registrar conflito com candidatos ativos ou rejeitados anteriormente.
- [x] Registrar explicacao resumida para aprovador humano.
- [x] Revisar status para incluir observacao pos-promocao, pausa e expiracao.

Contrato implementado:

- list/get enriquecidos: `GET /nlp/auto-review/promotion-candidates` e `.../:candidateVersion`;
- envelope `{ candidate, qualitySignals|qualityPreview, runtimeEffective:false }`;
- `qualitySignals`: coverage, bySegment, operationalCost (`estimate|unavailable`), temporal (`driftFlag: unknown`), conflicts, approverSummary;
- status `under_observation`/`paused`/`expired` **nao** ativados (defer AUTO-032); ficha so prepara leitura;
- approve/apply/rollback e politica v1 inalterados.

#### AUTO-031 - Aprimorar replay/shadow comparativo

- [x] Separar amostra historica de treino, validacao e holdout.
- [x] Medir drift entre feedbacks antigos e recentes.
- [x] Comparar versao candidata contra versao atual por segmento critico.
- [x] Medir ganho real de reducao de revisao manual.
- [x] Medir aumento de falso positivo por faixa de valor.
- [x] Identificar categorias, contas e intents com regressao escondida pelo score global.
- [x] Criar relatorio comparativo com recomendacao automatica: promover, observar, rejeitar ou reduzir escopo.
- [x] Reprocessar candidatos rejeitados somente quando houver evidencia nova.

Contrato implementado:

- endpoint `GET /nlp/auto-review/promotion-candidates/:candidateVersion/comparative-replay`;
- `runtimeEffective=false`; recomendacao `promote|observe|reject|reduce_scope` sem executar;
- `sampleSplit.mode` = `temporal` ou `stub` honesto (sem fingir holdout ML);
- `bySegment` com verdicts 029 + `hiddenRegression`; `above_limit` excluded;
- evidência segmentada do candidato pode vir `evidenceAvailable=false` ate replay fino;
- `rejectedReprocess.eligibleForReprocess` sinaliza sem disparar reprocess automatico.

#### AUTO-032 - Aprimorar workflow de aprovacao de promocao

- [x] Adicionar etapa de observacao pos-promocao.
- [x] Permitir promocao parcial por segmento quando a evidencia global for insuficiente.
- [x] Permitir expirar aprovacao quando candidato ficar antigo sem aplicacao.
- [x] Exigir motivo estruturado para aprovacao excepcional.
- [x] Registrar decisao humana contra recomendacao automatica.
- [x] Expor fila de candidatos com maior impacto esperado e menor risco.
- [x] Criar alertas quando candidato ativo degradar metricas alem do limite.

Contrato implementado (fatia fina):

- fila ordenada por risco↑ / amostra↓ com `workflowRecommendation`;
- detail inclui `workflow` (reco + expires + observationNote);
- approve aceita `reasonCode` / `decisionVsRecommendation` / `exceptionalReason` (override exige motivo);
- `POST .../expire` para approved sem apply → rejected + `expired_unapplied`;
- promocao parcial / alertas automaticos **deferidos** (só sinal reduce_scope).

#### AUTO-033 - Aprimorar rollback e despromocao

- [x] Diferenciar rollback imediato, pausa temporaria e expiracao planejada.
- [x] Definir gatilhos automaticos de pausa por degradacao de metrica.
- [x] Permitir despromoção parcial por segmento.
- [x] Registrar impacto estimado do rollback no volume de revisao manual.
- [x] Reprocessar amostra afetada apos rollback, pausa ou expiracao.
- [x] Expor historico de aprendizagem promovida, pausada, expirada e revertida.
- [x] Garantir que rollback nao altera feedbacks ja revisados nem transacoes existentes sem fluxo explicito.

Contrato implementado (fatia fina):

- `POST .../rollback` com `kind=immediate|pause|expire`; grava em `rollbackReason`/`notes`;
- kind `immediate`/`pause` desativa alias runtime (034); history expoe `rollbackKind`;
- gatilhos auto / despromoção parcial **deferidos**;
- reprocess amostra shadow pos apply/rollback de alias **ligado** (via `revaluateAffectedSample`);
- feedbacks/transações permanece intactos.

#### AUTO-034 - Persistir aliases e ativar promocao no runtime

- [x] Criar tabela/entidade de aliases efetivos por owner, campo, valor canonico, alias, versao e status.
- [x] Migrar aliases estaticos atuais de `alias.rules.ts` para seed/migration controlada ou rotina de bootstrap idempotente.
- [x] Alterar o avaliador para carregar aliases ativos do banco com fallback seguro para a versao estatica durante transicao.
- [x] Conectar candidato de promocao do tipo `alias` ao cadastro de alias efetivo quando aprovado e aplicado.
- [x] Garantir que alias aplicado registre versao candidata, versao anterior, aprovador, evidencia e plano de rollback.
- [x] Impedir ativacao automatica quando houver conflito de alias para o mesmo owner/campo ou entidade inexistente.
- [x] Versionar/cachear aliases em runtime para evitar consulta excessiva e permitir invalidacao controlada apos promocao/rollback.
- [x] Garantir rollback/despromocao de alias sem alterar feedbacks ja revisados nem transacoes existentes.
- [x] Expor relatorio dos aliases efetivos, origem da promocao e status runtime.

Contrato implementado:

- migration `1781278085296` + entity `bk_tb_feedback_auto_review_effective_alias`;
- `apply` de alias aprovado → runtime `active`; evaluator/NLP usam DB+fallback estático;
- `GET /nlp/auto-review/effective-aliases`; conflito bloqueia apply;
- `runtimeEffective` passa a refletir aliases ativos (não mais constante false);
- auto-promoção continua `false`; estático permanece fallback (sem dump completo obrigatório).

### Passo a passo

1. Coletar metricas e divergencias depois da primeira rodada de promocao controlada.
2. Reavaliar learning loop, cobertura, qualidade do dataset e lacunas de label.
3. Reavaliar politica, limites e criterios de excecao.
4. Aprimorar o contrato dos candidatos com sinais de cobertura, drift e custo operacional.
5. Robustecer replay/shadow com amostras separadas e analise por segmento.
6. Aprimorar workflow com observacao, expiracao e promocao parcial.
7. Evoluir rollback para pausa, expiracao e despromocao parcial.
8. Migrar aliases para persistencia versionada e conectar promocao aprovada ao runtime.
9. Gerar nova versao operacional do learning loop apenas com evidencia auditavel.

### Riscos e limites

- Reavaliacao sem amostra holdout pode otimizar para erros ja conhecidos e piorar casos novos.
- Aprimorar learning loop nao significa liberar autonomia irrestrita.
- Auto-promocao continua sendo excecao futura e precisa de criterio aprovado no Marco 2.
- Rollback, pausa ou expiracao de comportamento nao deve reescrever feedbacks ou transacoes ja processadas sem fluxo explicito.

## Sequencia de entrega sugerida

1. Entregar Marco 1 e validar com testes unitarios.
2. Rodar Marco 2 em shadow por um periodo com volume real de feedbacks.
3. Rodar learning loop supervisionado com reviews humanos e divergencias do shadow.
4. Revisar falsos positivos e falsos negativos por versao.
5. Comparar a nova versao em shadow antes de ampliar autonomia.
6. Definir politica de promocao ainda no Marco 2 antes de ativar aprendizados promoviveis.
7. Habilitar Marco 3 apenas para casos com score alto, baixo valor, evidencia de aprendizado validado e politica de promocao definida.
8. Usar Marco 4 para operar, auditar e decidir se vale adicionar LLM judge.
9. Usar Marco 5 para reavaliar e aprimorar o learning loop com dados reais.

## Ordem priorizada das tasks

| Ordem | Prioridade | Marco   | Task                                                       | Status            | Dependencias principais                           | Objetivo da sequencia                                                          |
| ----- | ---------- | ------- | ---------------------------------------------------------- | ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | P0         | Marco 1 | AUTO-001 - Definir contrato de decisao                     | Concluida         | Nenhuma                                           | Criar linguagem comum de decisao, reasons, score e correcao                    |
| 2     | P0         | Marco 1 | AUTO-002 - Mapear regras por intent                        | Concluida         | AUTO-001                                          | Definir campos criticos e invalidantes para `create` e `transfer`              |
| 3     | P0         | Marco 1 | AUTO-003 - Criar `FeedbackAutoReviewService`               | Concluida         | AUTO-001, AUTO-002                                | Centralizar avaliacao sem efeitos colaterais                                   |
| 4     | P0         | Marco 1 | AUTO-004 - Validar entidades do owner                      | Concluida         | AUTO-003                                          | Evitar aprovar conta/categoria inexistente para o owner                        |
| 5     | P0         | Marco 1 | AUTO-005 - Testar validacoes criticas                      | Concluida         | AUTO-003, AUTO-004                                | Garantir guardrails deterministicas antes de evoluir                           |
| 6     | P0         | Marco 2 | AUTO-006 - Expor score por campo                           | Concluida         | Marco 1                                           | Medir confianca por campo critico                                              |
| 7     | P0         | Marco 2 | AUTO-007 - Definir thresholds iniciais                     | Concluida         | AUTO-006                                          | Definir limites conservadores para aprovar, corrigir ou revisar                |
| 8     | P0         | Marco 2 | AUTO-009 - Registrar razoes de decisao                     | Concluida         | AUTO-006, AUTO-007                                | Explicar cada decisao com reasons auditaveis                                   |
| 9     | P0         | Marco 2 | AUTO-008 - Implementar modo shadow                         | Concluida         | AUTO-006, AUTO-007, AUTO-009                      | Medir decisoes sem alterar feedbacks                                           |
| 10    | P0         | Marco 2 | AUTO-010 - Criar relatorio operacional inicial             | Concluida         | AUTO-008                                          | Comparar decisao shadow contra revisao humana                                  |
| 11    | P0         | Marco 2 | AUTO-022 - Criar learning loop supervisionado inicial      | Concluida         | AUTO-008, AUTO-010                                | Transformar reviews humanos em metricas, divergencias e insumos de aprendizado |
| 12    | P0         | Marco 2 | AUTO-023 - Definir politica de promocao do autoavaliador   | Concluida         | AUTO-022                                          | Definir como aprendizado pode virar comportamento ativo                        |
| 13    | P0         | Marco 2 | AUTO-024 - Criar modelo de candidato promovivel            | Concluida         | AUTO-023                                          | Padronizar candidato de alias, regra, threshold, modelo ou politica            |
| 14    | P0         | Marco 2 | AUTO-025 - Executar replay/shadow comparativo              | Concluida         | AUTO-024                                          | Comparar candidato contra versao atual antes de promocao                       |
| 15    | P0         | Marco 2 | AUTO-026A - Criar persistencia de candidatos de promocao   | Concluida         | AUTO-025                                          | Persistir candidatos promoviveis com evidencia, risco e rollback               |
| 16    | P0         | Marco 2 | AUTO-026B - Criar workflow de aprovacao de promocao        | Concluida         | AUTO-026A                                         | Aprovar, rejeitar ou aplicar candidato com auditoria                           |
| 17    | P0         | Marco 2 | AUTO-027 - Implementar rollback de promocao                | Concluida         | AUTO-026B                                         | Reverter promocao aplicada sem reescrever historico financeiro                 |
| 18    | P1         | Marco 3 | AUTO-011 - Sugerir correcao por alias                      | Concluida         | AUTO-010, AUTO-022                                | Sugerir correcao segura quando alias conhecido resolver entidade existente     |
| 19    | P1         | Marco 3 | AUTO-012 - Aplicar limites por valor                       | Concluida         | AUTO-007                                          | Restringir autonomia por limite financeiro conservador                         |
| 20    | P1         | Marco 3 | AUTO-013 - Criar fluxo de autoaprovacao controlada         | Base implementada | AUTO-022, AUTO-023, AUTO-025                      | Aplicar `approve` somente quando politica permitir                             |
| 21    | P1         | Marco 3 | AUTO-014 - Criar fluxo de autocorrecao controlada          | Concluida         | AUTO-011, AUTO-022, AUTO-023, AUTO-025            | Aplicar `correct` somente para correcao segura e promovida                     |
| 22    | P1         | Marco 3 | AUTO-015 - Testar nao sobrescrita humana                   | Concluida         | AUTO-013, AUTO-014                                | Garantir que automacao nunca sobrescreve revisao humana                        |
| 23    | P1         | Marco 4 | AUTO-016 - Criar metricas de qualidade                     | Base implementada | AUTO-010, AUTO-022                                | Medir qualidade operacional por decisao, intent e campo                        |
| 24    | P1         | Marco 4 | AUTO-017 - Criar trilha de auditoria                       | Concluida         | AUTO-013, AUTO-014, AUTO-026B                     | Rastrear versoes, reasons, aplicacoes e bloqueios                              |
| 25    | P1         | Marco 4 | AUTO-018 - Definir rotina de reavaliacao                   | Concluida         | AUTO-008, AUTO-022, AUTO-025                      | Reprocessar feedbacks elegiveis de forma idempotente                           |
| 26    | P2         | Marco 4 | AUTO-021 - Sugerir aliases a partir de divergencias        | Concluida         | AUTO-022, AUTO-023, AUTO-024                      | Gerar candidatos de alias para promocao controlada                             |
| 27    | P2         | Marco 4 | AUTO-020 - Consolidar playbook operacional                 | Concluida         | AUTO-016, AUTO-017, AUTO-018, AUTO-023, AUTO-027  | Documentar ativacao, monitoramento, desligamento e rollback                    |
| 28    | P3         | Marco 4 | AUTO-019 - Criar criterios para LLM judge opcional         | Pendente          | AUTO-016, AUTO-020                                | Avaliar LLM apenas para casos ambiguos e sem autonomia direta                  |
| 29    | P1         | Marco 5 | AUTO-028 - Reavaliar learning loop supervisionado          | Concluida         | AUTO-022, AUTO-016, AUTO-018                      | Revisar cobertura, qualidade e lacunas do aprendizado com dados reais          |
| 30    | P1         | Marco 5 | AUTO-029 - Reavaliar politica de promocao do autoavaliador | Concluida         | AUTO-023, AUTO-026B, AUTO-027, AUTO-016, AUTO-028 | Ajustar criterios de promocao com dados reais                                  |
| 31    | P1         | Marco 5 | AUTO-030 - Aprimorar modelo de candidato promovivel        | Concluida         | AUTO-024, AUTO-028, AUTO-029                      | Evoluir evidencias, cobertura e risco dos candidatos                           |
| 32    | P1         | Marco 5 | AUTO-031 - Aprimorar replay/shadow comparativo             | Concluida         | AUTO-025, AUTO-030                                | Medir drift, regressao segmentada e ganho operacional                          |
| 33    | P1         | Marco 5 | AUTO-032 - Aprimorar workflow de aprovacao de promocao     | Concluida         | AUTO-026B, AUTO-031                               | Adicionar observacao, expiracao e promocao parcial                             |
| 34    | P1         | Marco 5 | AUTO-033 - Aprimorar rollback e despromocao                | Concluida         | AUTO-027, AUTO-032                                | Permitir pausa, expiracao e despromocao parcial                                |
| 35    | P1         | Marco 5 | AUTO-034 - Persistir aliases e ativar promocao no runtime  | Concluida         | AUTO-017, AUTO-021, AUTO-027, AUTO-032, AUTO-033  | Aplicar alias aprovado no avaliador sem edicao manual de codigo                |

Legenda:

- `P0`: bloqueia seguranca ou autonomia futura.
- `P1`: necessario para automacao controlada e operacao segura.
- `P2`: melhoria assistida ou eficiencia operacional.
- `P3`: opcional ou exploratorio.

## Definicao de pronto

Cada tarefa deve ser considerada pronta somente quando tiver:

- implementacao pequena e revisavel;
- teste proporcional ao risco;
- decisao auditavel quando houver alteracao de status;
- impacto em contrato documentado quando houver endpoint novo;
- validacao local com `pnpm run test -- --runInBand` e `pnpm run build`, quando houver codigo.

## Fora do escopo inicial

- Criar transacao automaticamente apos autoaprovacao.
- Usar LLM como aprovador final.
- Alterar schema de banco sem planejamento de migration.
- Retreinar classificadores automaticamente com feedback autoaprovado sem controle de qualidade.
- Criar ou aplicar aliases automaticamente sem promocao aprovada, rollback e auditoria.
- Promover nova versao de avaliador sem comparacao em modo shadow.
