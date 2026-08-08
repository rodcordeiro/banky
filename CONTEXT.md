# Banky API

API principal do Banky para contas, categorias, pagamentos, transações, autenticação e NLP integrado.

## Language

**Feedback**:
Registro NLP pendente de revisão humana antes de virar lançamento.
_Avoid_: Ticket, issue, sugestão da IA

**Status de negócio**:
Estado efetivo do feedback: `pending`, `validated` ou `corrected`.
_Avoid_: Decisão do autoavaliador, status do modelo

**Decisão do autoavaliador**:
Avaliação sugerida (`approve`, `correct`, `manual_review`, `reject`), separada do status de negócio.
_Avoid_: Status, aprovação definitiva

**Revisão humana**:
Fonte de verdade para labels e para medir falso positivo do shadow.
_Avoid_: Label automático, autoaprovação

**Inspection ready**:
Há amostra mínima revisada com shadow para inspecionar divergências; não autoriza promoção.
_Avoid_: Eligible, pronto para ativar

**Promotion readiness**:
Sinal de que a amostra atende a política de alias para o aprovador humano decidir; nunca autoativa.
_Avoid_: Auto-promoção, regra ativa, runtime active

**Promotion evidence**:
Dossiê somente leitura no learning loop com versão, amostra, métricas, critérios e exigência de rollback.
_Avoid_: Histórico persistido a cada consulta

**Ciclo de promoção**:
Estados do candidato (`candidate`, `approved`, `active`, `rolled_back`); `active` não significa regra no avaliador.
_Avoid_: Runtime effective, regra viva

**Runtime effective**:
Regra/alias que o avaliador realmente usa (ainda não ligado; depende de persistência futura).
_Avoid_: Candidato active, promoção aplicada
