# Backlog - Autoavaliador de feedbacks NLP

## Objetivo

Criar um fluxo progressivo para revisar feedbacks NLP e permitir aprovacao ou correcao autonoma com baixo risco operacional.

Como o resultado pode criar transacoes financeiras, a automacao deve comecar em modo auditavel, com limites claros, fallback para revisao manual e metricas antes de aprovar feedbacks sem intervencao humana.

## Recomendacao

Adotar um autoavaliador hibrido em 4 marcos:

1. Validacao deterministica e modelo de decisao.
2. Score de confianca e modo shadow.
3. Correcao assistida e aprovacao automatica limitada.
4. Operacao, auditoria e evolucao do avaliador.

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

## Marco 1 - Base deterministica

Objetivo: criar a fundacao do autoavaliador sem autonomia real. Ao final, o sistema deve conseguir avaliar um feedback com regras deterministicas e explicar a decisao.

### Sprint 1

| ID | Tarefa | Entrega | Criterio de aceite |
| --- | --- | --- | --- |
| AUTO-001 | Definir contrato de decisao | Interfaces/enums para decisao, razoes e correcao sugerida | Implementado em `src/modules/nlp/interfaces/index.ts` |
| AUTO-002 | Mapear regras por intent | Lista de regras para `create` e `transfer` | Implementado em `AUTO_REVIEW_INTENT_RULES` |
| AUTO-003 | Criar `FeedbackAutoReviewService` | Service sem efeitos colaterais que recebe feedback e contexto | Implementado em `src/modules/nlp/services/feedback-auto-review.service.ts` |
| AUTO-004 | Validar entidades do owner | Checagem de conta/categoria contra repositorios existentes | Implementado em `NlpService.evaluateFeedbackAutoReview` |
| AUTO-005 | Testar validacoes criticas | Testes unitarios das regras deterministicas | Casos de valor invalido, conta ausente e transferencia incompleta cobertos |

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

| ID | Tarefa | Entrega | Criterio de aceite |
| --- | --- | --- | --- |
| AUTO-006 | Expor score por campo | Modelo interno com score para intent, conta, categoria, valor e data | Resultado inclui score geral e score por campo |
| AUTO-007 | Definir thresholds iniciais | Configuracao de limites para aprovar, revisar ou rejeitar | Thresholds documentados e centralizados |
| AUTO-008 | Implementar modo shadow | Job/service executa autoavaliacao sem alterar feedback | Decisao automatica pode ser consultada sem efeito colateral |
| AUTO-009 | Registrar razoes de decisao | Lista de reasons padronizadas | Cada decisao retorna pelo menos uma razao |
| AUTO-010 | Criar relatorio operacional inicial | Consulta ou endpoint interno para comparar decisoes shadow | Relatorio lista feedback, decisao, score e razoes |

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

- Criar catalogo de reason codes.
- Separar reasons informativas de invalidantes.
- Incluir campo afetado em cada reason.
- Incluir mensagem tecnica curta.
- Garantir pelo menos uma reason por resultado.
- Cobrir reasons principais em teste.

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

### Passo a passo

1. Adaptar classificadores para expor sinal de confianca quando disponivel.
2. Calcular score geral a partir dos campos criticos.
3. Criar thresholds conservadores.
4. Rodar avaliador em modo shadow para feedbacks pendentes.
5. Comparar resultado automatico com revisao humana posterior.

### Riscos e limites

- Score do Naive Bayes nao deve ser tratado como probabilidade calibrada.
- Threshold inicial deve priorizar falso negativo, nao falso positivo.
- Modo shadow nao deve alterar `status`, `corrected*` ou criar transacao.

## Marco 3 - Correcao assistida e aprovacao limitada

Objetivo: permitir que o avaliador sugira correcoes seguras e aprove automaticamente apenas casos de baixo risco.

### Sprint 3

| ID | Tarefa | Entrega | Criterio de aceite |
| --- | --- | --- | --- |
| AUTO-011 | Sugerir correcao por alias | Correcao segura para categorias/contas conhecidas | Alias conhecido gera `correct` com razao auditavel |
| AUTO-012 | Aplicar limites por valor | Configuracao de valor maximo para aprovacao automatica | Valores acima do limite caem em `manual_review` |
| AUTO-013 | Criar fluxo de autoaprovacao controlada | Metodo separado para aplicar decisao `approve` | Apenas feedback elegivel altera status |
| AUTO-014 | Criar fluxo de autocorrecao controlada | Metodo separado para aplicar decisao `correct` | Correcao salva somente campos sugeridos com score suficiente |
| AUTO-015 | Testar nao sobrescrita humana | Testes garantindo que campos corrigidos manualmente nao sao sobrescritos | Feedback com correcao humana permanece intocado |

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

- Criar metodo `applyAutoReviewDecision`.
- Exigir decisao `approve`.
- Exigir modo `automatic`.
- Revalidar guardrails antes de salvar.
- Alterar status para `validated`.
- Registrar historico como `applied`.
- Nao criar transacao neste metodo.
- Testar idempotencia.

#### AUTO-014 - Criar fluxo de autocorrecao controlada

- Exigir decisao `correct`.
- Exigir modo `automatic`.
- Revalidar campos sugeridos.
- Preencher somente `corrected*` sugeridos.
- Alterar status para `corrected`.
- Registrar historico como `applied`.
- Bloquear correcao parcial insegura.
- Testar correcao de conta/categoria/valor.

#### AUTO-015 - Testar nao sobrescrita humana

- Criar fixture com `status=corrected`.
- Criar fixture com `correctedAccount`.
- Criar fixture com `correctedCategory`.
- Criar fixture com `correctedValue`.
- Garantir que apply nao sobrescreve campo corrigido.
- Garantir que historico registra bloqueio por correcao humana.

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

| ID | Tarefa | Entrega | Criterio de aceite |
| --- | --- | --- | --- |
| AUTO-016 | Criar metricas de qualidade | Contadores de aprovacao, correcao, revisao e erro | Metricas separadas por decisao e intent |
| AUTO-017 | Criar trilha de auditoria | Registro de versao, razoes, score e alteracoes aplicadas | Cada decisao aplicada e rastreavel |
| AUTO-018 | Definir rotina de reavaliacao | Job para reprocessar feedbacks pendentes elegiveis | Reprocessamento e idempotente |
| AUTO-019 | Criar criterios para LLM judge opcional | Documento com quando usar ou nao usar judge externo | LLM restrito a casos ambiguos e sem autonomia direta |
| AUTO-020 | Consolidar playbook operacional | Passo a passo para ativar, monitorar e desligar autoaprovacao | Operador consegue habilitar/desabilitar com seguranca |

### Subtarefas

#### AUTO-016 - Criar metricas de qualidade

- Contar decisoes por modo.
- Contar decisoes por intent.
- Contar aplicacoes automaticas.
- Contar bloqueios por guardrail.
- Medir divergencia entre shadow e revisao humana.
- Medir taxa de falso positivo conhecida.
- Expor metricas por log estruturado ou endpoint interno.

#### AUTO-017 - Criar trilha de auditoria

- Persistir versao do avaliador.
- Persistir reasons completas.
- Persistir correcoes sugeridas.
- Persistir snapshot dos scores.
- Persistir usuario/origem quando aplicavel.
- Registrar quando decisao foi aplicada.
- Registrar quando decisao foi bloqueada.

#### AUTO-018 - Definir rotina de reavaliacao

- Selecionar feedbacks pendentes elegiveis.
- Ignorar feedbacks ja avaliados na mesma versao.
- Limitar volume por execucao.
- Registrar inicio/fim da rotina.
- Tratar erro por feedback sem interromper lote inteiro.
- Garantir reprocessamento idempotente.

#### AUTO-019 - Criar criterios para LLM judge opcional

- Definir quais dados podem ser enviados.
- Definir campos proibidos/sensiveis.
- Definir prompt/schema de resposta.
- Exigir JSON estrito.
- Restringir LLM a modo shadow ou assistivo.
- Definir threshold minimo para aceitar sugestao.
- Documentar custo e risco operacional.

#### AUTO-020 - Consolidar playbook operacional

- Documentar como ativar modo shadow.
- Documentar como ativar modo assistivo.
- Documentar como ativar modo automatico limitado.
- Documentar como desligar autoaprovacao.
- Documentar metricas que devem ser acompanhadas.
- Documentar procedimento de rollback.
- Documentar criterios para aumentar autonomia.

### Passo a passo

1. Medir decisoes antes de ampliar autonomia.
2. Expor metricas por modo: shadow, assistido e automatico.
3. Criar auditoria suficiente para explicar cada status alterado.
4. Definir processo de rollback operacional.
5. Avaliar uso de LLM apenas depois de conhecer os erros recorrentes.

### Riscos e limites

- Sem metricas, nao aumentar autonomia.
- LLM nao deve receber dados sensiveis desnecessarios.
- LLM nao deve aplicar decisao sozinho; no maximo sugere `manual_review` ou correcao assistida.

## Sequencia de entrega sugerida

1. Entregar Marco 1 e validar com testes unitarios.
2. Rodar Marco 2 em shadow por um periodo com volume real de feedbacks.
3. Revisar falsos positivos e falsos negativos.
4. Habilitar Marco 3 apenas para casos com score alto e baixo valor.
5. Usar Marco 4 para operar, auditar e decidir se vale adicionar LLM judge.

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
