# Banky API

API principal do Banky: o user autentica, organiza contas e categorias, registra lançamentos e revisa feedbacks de texto livre antes de virarem transação.

## Language

### Pessoas e acesso

**User**:
Titular autenticado da aplicação; dono das contas, categorias, parâmetros e feedbacks.
_Avoid_: Client, customer, account (isso é a conta financeira)

**Access token**:
Credencial curta que autoriza o user nas rotas protegidas.
_Avoid_: Session, API key

**Refresh token**:
Credencial longa usada só para emitir um novo access token.
_Avoid_: Access token, senha persistida

### Dinheiro e catálogo

**Account**:
Conta financeira do user, com saldo, limite e um tipo de pagamento.
_Avoid_: Wallet, bank, payment

**Saldo**:
Quantia atual da Account. No *contrato* HTTP e na persistência o campo chama-se `ammount`.
_Avoid_: Amount (grafia inglesa), balance, threshold

**Threshold**:
Limite associado à Account, distinto do saldo.
_Avoid_: Saldo, limite de crédito genérico

**Payment type**:
Item do catálogo global de formas de pagamento (débito, crédito, etc.), não escopado por user.
_Avoid_: Payment, transação, método da fatura

**Category**:
Classificação de um lançamento; pode ter pai. `positive=true` é crédito; `false` é débito.
_Avoid_: Tag, label, folder

**Classification**:
Grau opcional da Category: `essencial`, `importante`, `opcional`, `nao_controlavel`.
_Avoid_: Priority, status

**Transaction**:
Lançamento com descrição, valor, data, Account e Category.
_Avoid_: Payment, feedback, movimento bancário

**Transfer**:
Dois Transactions ligados pelo mesmo lote: debita a origem e credita o destino.
_Avoid_: Ted, pix, credit payment

**Credit payment**:
Um Transaction que paga fatura de cartão: debita a origem e credita a Account cartão.
_Avoid_: Transfer, pagamento avulso

**Uncategorized**:
Transactions nas Categories “desconhecida” positiva e negativa configuradas por parâmetro.
_Avoid_: Sem categoria no sentido de Category nula

**Parameter**:
Definição de configuração do sistema, identificada por `key` única.
_Avoid_: Env, setting de deploy

**Parameter value**:
Valor de um Parameter para um User específico.
_Avoid_: Parameter (a definição)

### NLP e revisão

**Feedback**:
Parse de texto livre aguardando ou já passado por revisão humana; virar Transaction é um passo separado.
_Avoid_: Ticket, issue, sugestão da IA, transação

**Intent**:
Ação prevista no Feedback: `create` (lançamento) ou `transfer` (entre contas).
_Avoid_: Decision do autoavaliador

**Status de negócio**:
Estado efetivo do Feedback: `pending`, `validated` ou `corrected`.
_Avoid_: Decisão do autoavaliador, status do modelo

**Predicted fields**:
Valores inferidos pelo classificador (conta, categoria, valor, data).
_Avoid_: Corrected fields, verdade de treino

**Corrected fields**:
Valores ajustados na revisão humana. No JSON de review, parte das chaves usa a grafia `orrected*`.
_Avoid_: Predicted fields

**Decisão do autoavaliador**:
Avaliação sugerida (`approve`, `correct`, `manual_review`, `reject`), separada do status de negócio.
_Avoid_: Status, aprovação definitiva, “IA aprovou o lançamento”

**Revisão humana**:
Fonte de verdade para labels e para medir falso positivo do shadow.
_Avoid_: Label automático, autoaprovação

**Shadow mode**:
Avaliação automática que grava histórico e não altera Feedback nem Transaction.
_Avoid_: Assistive, automatic, runtime effective

**Alias**:
Mapeamento de um padrão textual para um valor canônico de Account ou Category.
_Avoid_: Category, regra viva

**Promotion candidate**:
Versão candidata de alias/regra no ciclo de promoção, aguardando o humano.
_Avoid_: Effective alias, regra no avaliador

**Ciclo de promoção**:
Estados do candidato (`candidate`, `shadow_validated`, `approved`, `active`, `rejected`, `rolled_back`). `active` é estado do ciclo, não o nome da regra no avaliador.
_Avoid_: Runtime effective, “alias ativo”

**Effective alias**:
Alias persistido que o avaliador usa após `apply` do candidato (com fallback estático).
_Avoid_: Candidato `active` sem apply, sugestão, inspection ready

**Runtime effective**:
O avaliador está usando aliases persistidos daquele owner. Falso em leituras analíticas e em shadow; verdadeiro após `apply` enquanto o alias estiver ativo.
_Avoid_: Candidato `active` sozinho, auto-promoção, “ainda não ligado”

**Rollback**:
Desativa o effective alias e manda o candidato para `rolled_back`; não reescreve Feedbacks nem Transactions.
_Avoid_: Delete, expire de approved sem apply

**Inspection ready**:
Há amostra mínima revisada com shadow para inspecionar divergências; não autoriza promoção.
_Avoid_: Eligible, pronto para ativar

**Promotion readiness**:
Sinal de que a amostra atende a política de alias para o aprovador humano decidir; nunca autoativa.
_Avoid_: Auto-promoção, regra ativa, runtime active

**Promotion evidence**:
Dossiê somente leitura no learning loop com versão, amostra, métricas, critérios e exigência de rollback.
_Avoid_: Histórico persistido a cada consulta
