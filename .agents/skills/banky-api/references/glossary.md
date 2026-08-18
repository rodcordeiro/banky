# Glossário — banky-api

Vocabulário do domínio. *ammount* (dois m) é a grafia do *contrato* de saldo em Account.

## Entidades principais

| Termo | Significado |
|-------|-------------|
| **User** | Titular autenticado; identificado por JWT (`id`, `username`). |
| **Account** | Conta financeira do user com saldo (`ammount`), limite (`threshold`) e tipo de pagamento. |
| **Payment type** | Catálogo global de formas de pagamento (ex.: débito, crédito). Não é escopado por user. |
| **Category** | Classificação de lançamento; pode ser hierárquica (`category` = id do pai). `positive=true` = crédito; `false` = débito. |
| **Transaction** | Lançamento com descrição, valor, data, conta e categoria. Pode compartilhar `batchId` em transferências. |
| **Parameter** | Definição de configuração do sistema (`key` única). |
| **Parameter value** | Valor de um parâmetro para um user específico (`owner`). |
| **Feedback** | Resultado do parse NLP de texto livre; passa por revisão humana antes de virar transação ou treino. |

## Classificação de categoria

Valores opcionais em `classification`:

- `essencial`
- `importante`
- `opcional`
- `nao_controlavel`

## Feedback NLP

| Termo | Significado |
|-------|-------------|
| **Intent** | Ação prevista: `create` (lançamento) ou `transfer` (entre contas). |
| **Status** | `pending` → aguardando revisão; `validated` → aceito sem correção; `corrected` → aceito com correção. |
| **Predicted fields** | Valores inferidos pelo classificador (conta, categoria, valor, data). |
| **Corrected fields** | Valores ajustados na revisão humana. |
| **usedForTraining** | Feedback já consumido em treino incremental. |

## Auto-review (sombra)

| Termo | Significado |
|-------|-------------|
| **Shadow mode** | Avaliação automática sem efeito em produção (`runtimeEffective: false`). |
| **Alias** | Mapeamento pattern → valor canônico (conta ou categoria). |
| **Promotion candidate** | Versão candidata de alias/regra aguardando aprovação humana. |
| **Effective alias** | Alias ativo em runtime após `apply` do candidato. |
| **Rollback** | Desativa alias ativo; candidato vai para `rolled_back`. |

Status de candidato: `candidate` → `shadow_validated` → `approved` → `active` | `rejected` | `rolled_back`.

## Fluxos compostos

| Termo | Significado |
|-------|-------------|
| **Transfer** | Duas transações ligadas por `batchId`; debita origem e credita destino via categorias de parâmetro. |
| **Credit payment** | Pagamento de fatura de cartão; uma transação debitando origem e creditando conta cartão. |
| **Uncategorized** | Transações nas categorias "desconhecida" positiva/negativa configuradas por parâmetro. |

## Parâmetros conhecidos (keys)

| Key | Uso |
|-----|-----|
| `unknown_positive_category` | Categoria fallback para créditos não classificados |
| `unknown_negative_category` | Categoria fallback para débitos não classificados |
| `transference_origin_category` | Categoria na conta de origem em transferência |
| `transference_destiny_category` | Categoria na conta de destino em transferência |
| `credit_payment_category` | Categoria usada em pagamento de cartão |

## Auth

| Termo | Significado |
|-------|-------------|
| **Access token** | JWT curto (~1 h) para `@Auth()`. |
| **Refresh token** | JWT longo (~5 dias) persistido no user; usado em `@Reauth()`. |
