# Spec: *contrato* e domínio da banky-api (review 2026-08-18)

## Problem Statement

Quem lê as specs da API não consegue saber o que o produto faz de verdade. O glossário dizia que runtime efetivo “ainda não estava ligado”, o playbook ainda falava “até AUTO-034”, e o checkout já persiste alias depois do `apply`. Lista de contas filtra o user; busca por id não filtra. Saldo só muda em três criações; editar ou apagar lançamento deixa o saldo parado. O teste e2e de “contrato” ainda é Hello World. Agente, app e operador acabam misturando status de negócio, decisão do autoavaliador e regra viva no avaliador.

## Solution

Uma spec de registro descreve o produto **como está** (comportamento observável) e marca **lacunas abertas** (o que ainda não foi decidido para mudar). A linguagem de domínio fica no glossário; o *contrato* HTTP continua sendo lookup na skill; o playbook cobre só operação do autoavaliador. Runtime effective passa a significar “o avaliador está usando alias persistido daquele user”, não “feature futura”. Ownership por id, recomputo de saldo em PUT/DELETE, `GET /users` e e2e real ficam explícitos como débito — não como regra de negócio inventada.

## User Stories

1. As a user, I want to register with name, username and password, so that I can start using the API without someone else creating my User.
2. As a user, I want to log in with username and password, so that I receive an access token and a refresh token.
3. As a user, I want my access token to expire in about one hour, so that a leaked short token has a limited window.
4. As a user, I want to refresh with the refresh token, so that I can get a new pair without typing the password.
5. As a user, I want refresh to fail if the JWT is invalid or expired, so that a forged body cannot mint new access tokens.
6. As a user, I want `GET /users/me` to return only my User, so that I can see my own profile.
7. As an operator, I want to know that `GET /users` currently lists every User, so that I do not treat it as a private “me” endpoint.
8. As a user, I want to create an Account with name, saldo (`ammount`), threshold and payment type, so that I can track money in that Account.
9. As a user, I want listing Accounts to return only my Accounts, so that I do not see someone else’s wallets.
10. As a user, I want creating an Account to stamp me as owner, so that later lists can find it.
11. As a user, I want to know that `GET /accounts/:id` currently returns any Account by id, so that I do not assume privacy on that path.
12. As a user, I want to know that `DELETE /accounts/:id` currently deletes by id without checking owner, so that I understand the risk.
13. As a user, I want updating an Account to force my id as owner on the payload, so that create-like fields stay mine — even if the row I hit was not mine.
14. As a user, I want Categories to be hierarchical, so that I can group subcategories under a parent.
15. As a user, I want a Category to be credit or debit (`positive`), so that a Transaction can move saldo in the right direction.
16. As a user, I want an optional Classification on a Category, so that I can mark essencial / importante / opcional / nao_controlavel.
17. As a user, I want listing Categories to return my roots with subcategories, paginated as `{ items, meta }`, so that I see my tree without loading every root at once.
18. As a user, I want to know that `GET/PUT/DELETE /categories/:id` currently do not check owner, so that I do not assume isolation.
19. As a user, I want to create a Transaction with description, Account, Category, date and value, so that the lançamento exists and saldo moves.
20. As a user, I want saldo to increase when the Category is credit and decrease when it is debit, so that the Account reflects the lançamento.
21. As a user, I want listing Transactions to be mine, paginated, newest date first, so that I can review history.
22. As a user, I want Uncategorized Transactions to use the unknown positive/negative Categories from my parameters, so that I can finish classification later.
23. As a user, I want a Transfer to create two Transactions with the same batch, so that origin and destiny stay reconcilable.
24. As a user, I want Transfer to debit origin and credit destiny using the transfer Category parameters, so that I do not pick those Categories by hand.
25. As a user, I want credit payment to create one Transaction that pays the card Account, so that the invoice payment is not modelled as Transfer.
26. As a user, I want to know that PUT Transaction does not recompute saldo, so that I do not use edit as a balance fix.
27. As a user, I want to know that DELETE Transaction does not revert saldo, so that I do not use delete as a balance fix.
28. As a user, I want to know that `GET /transactions/:id` currently ignores owner, so that I do not assume privacy on that path.
29. As an operator, I want Payment types to be a global catalog, so that every User shares débito/crédito names.
30. As an operator, I want to create, rename and delete Payment types, so that the catalog can evolve.
31. As an operator, I want Parameter definitions to be global, so that keys like unknown categories stay consistent.
32. As a user, I want Parameter values scoped to me, so that my unknown Categories and transfer Categories are mine.
33. As a user, I want to parse free text into a Feedback, so that I can review a predicted Intent, Account, Category, value and date.
34. As a user, I want a new Feedback to start as pending and not used for training, so that nothing trains or posts a Transaction without me.
35. As a user, I want listing Feedbacks to be mine and paginated, so that I can work a review queue.
36. As a user, I want to set status validated when the prediction is right, so that the Feedback can train and later become a Transaction.
37. As a user, I want to set status corrected with at least one corrected field, so that the human label is explicit.
38. As a user, I want the review JSON to keep `orrectedOriginAccount` and `orrectedCategory`, so that existing clients do not break.
39. As a user, I want training to skip pending Feedbacks, so that unreviewed text does not become a label.
40. As a user, I want incremental training to mark usedForTraining, so that the same Feedback is not consumed twice.
41. As a user, I want creating a Transaction from a reviewed Feedback to be a separate call, so that review does not silently move money.
42. As a user, I want a transfer Intent to create a Transfer from the Feedback, so that the pair of Accounts is honoured.
43. As a user, I want shadow auto-review to write history without changing status or corrected fields, so that I remain the source of truth.
44. As a user, I want shadow revaluation to skip the same Feedback+version, so that reruns do not duplicate noise.
45. As an operator, I want quality metrics and learning-loop to stay read-only, so that looking at numbers never promotes a rule.
46. As an operator, I want inspection ready to mean “enough sample to look”, not “safe to activate”, so that I do not confuse gates.
47. As an operator, I want alias suggestions with volume and conflict flags, so that I do not promote garbage patterns.
48. As an operator, I want promote-eligible to create candidates only, so that the queue fills without applying runtime.
49. As an operator, I want approve of an alias candidate to stay blocked until shadow evidence of that alias exists, so that I cannot rubber-stamp an empty sample.
50. As an operator, I want override of a workflow recommendation to require reasonCode and exceptionalReason, so that exceptions are auditable and still cannot skip shadow gates.
51. As an operator, I want apply of an approved alias to persist an Effective alias, so that the evaluator actually uses it.
52. As an operator, I want apply to re-run shadow on the affected sample without rewriting Feedback status, so that I can see post-apply behaviour.
53. As an operator, I want rollback with kind immediate, pause or expire to deactivate runtime and mark the candidate rolled_back, so that I can kill a bad alias.
54. As an operator, I want static alias rules to remain fallback when no DB alias wins the pattern, so that the evaluator never goes blank.
55. As an operator, I want automatic apply cron to stay off, so that the API never auto-approves Feedbacks.
56. As an operator, I want allowsAutoPromotion to stay false, so that candidates never self-activate.
57. As an agent, I want Status de negócio and Decisão do autoavaliador to be different words, so that I do not write “IA aprovou o lançamento”.
58. As an agent, I want candidate `active` and Runtime effective to be different words, so that I check effective-aliases before saying the evaluator changed.
59. As an agent, I want Saldo and `ammount` explained together, so that I do not “fix” the spelling in a DTO.
60. As an agent, I want the HTTP skill to stay a lookup (index first, NLP in its own page), so that I do not paste a 55-route catalog into another repo.
61. As a consumer of the mobile app, I want a named impact when a *contrato* changes, so that login, contas and NLP review do not drift silently.
62. As a consumer of the MCP, I want transaction and feedback tools to keep reading the same tables and field names, so that overviews stay true.
63. As a developer, I want throttle of 10 requests / 30 seconds documented, so that I do not design a huge auto-review batch against the global limiter.
64. As a developer, I want DB unique conflicts to surface as 409, so that duplicate username or keys are distinguishable from validation errors.
65. As a developer, I want not-found on core CRUD to stay 400 where that is today’s contract, so that clients do not guess 404.
66. As a developer, I want NLP not-found to stay 404, so that review of a missing Feedback is distinct from a bad body.
67. As a developer, I want Transfer HTTP to return 201 with empty body, so that I do not parse a missing pair of Transactions from the response.
68. As a developer, I want credit payment HTTP to return the Transaction, so that I can show the card payment row.
69. As an operator, I want health at `/api/health` without JWT, so that probes do not need a user.
70. As an operator, I want to know RabbitMQ is compiled in but not started, so that I do not wait for a queue that never consumes.
71. As a security reviewer, I want CSRF middleware logging of headers called out as a gap, so that I do not treat it as a control.
72. As a security reviewer, I want CORS `origin: '*'` called out as a gap, so that I do not assume browser isolation.
73. As a tester, I want `pnpm test:e2e` to stop being sold as *contrato* coverage while it only hits Hello World, so that I add real `/api/v1` examples before claiming a route is safe.
74. As a tester, I want existing controller specs that call get-by-id without owner to be treated as encoding current behaviour, so that a privacy fix is a deliberate spec change.
75. As a product owner, I want ownership-on-id, saldo-on-edit, and `GET /users` left as open decisions, so that this spec does not sneak in a security rewrite.

## Implementation Decisions

- Glossário de domínio vive só no CONTEXT: o que a coisa **é**. Sem rotas, tabelas ou nomes de classe.
- *Contrato* HTTP vive na skill `$banky-api`: índice no topo, CRUD/auth/health numa página, NLP/auto-review na outra. Checkout de controller/DTO ganha se a página estiver velha.
- Playbook de auto-review é operação: shadow, fila, apply, rollback, linguagem proibida. Não redefine Saldo nem Account.
- Nero guarda decisões e knowledge operacional; não substitui o glossário do checkout.
- Esta spec é o recorte grelhado: comportamento atual + lacunas. Não é backlog de implementação de ownership.
- Palavra de domínio para dinheiro na Account é **Saldo**. Payload e coluna continuam `ammount`.
- Chaves JSON `orrectedOriginAccount` e `orrectedCategory` são *contrato*, não typo a corrigir no fio.
- **User** é a pessoa. **Account** é a conta financeira. **Payment type** é catálogo global. **Transaction** é o lançamento.
- **Transfer** = dois Transactions no mesmo lote. **Credit payment** = um Transaction de fatura. Não unificar os dois fluxos.
- Feedback `pending` → revisão humana (`validated` / `corrected`) → criar Transaction é outra ação. Parse nunca move saldo.
- Status de negócio ≠ decisão do autoavaliador. Shadow e learning loop não escrevem status.
- Ciclo de promoção (`candidate` → … → `active` / `rolled_back`) ≠ Runtime effective. `apply` de alias persiste Effective alias; `rollback` desativa. Fallback estático permanece.
- `allowsAutoPromotion` permanece falso. Cron de apply automático permanece desligado. Leituras analíticas (suggestions, replay, policy reassessment) reportam `runtimeEffective: false` mesmo com aliases vivos — não usar esses envelopes para afirmar runtime.
- Lista/create de Accounts, Categories e Transactions escopam owner. `GET/PUT/DELETE /:id` (e delete de Account) **hoje** não verificam dono da linha. Documentar; não “consertar” nesta spec.
- `GET /users` **hoje** lista todos. `GET /users/me` é o perfil do JWT.
- Saldo **hoje** muda só em create Transaction, Transfer e credit payment. PUT/DELETE de Transaction não tocam saldo.
- Refresh **hoje** valida assinatura JWT do refresh; não compara o valor persistido no User. Rotação grava token novo; o JWT antigo ainda verifica até expirar.
- Auth e parte do NLP continuam sem Zod. Entidade TypeORM ainda sai na resposta. Throttle global 10/30s.
- RabbitMQ não entra na superfície viva: o bootstrap de microservices permanece comentado.
- Consumidores a nomear em mudança de *contrato*: app mobile e MCP de transações/feedbacks.

## Testing Decisions

- Testar comportamento observável: status HTTP, auth, escopo de lista, efeito em saldo, status de Feedback, `runtimeEffective` depois de apply/rollback. Não testar nomes internos de service nem SQL gerado.
- Seam principal desta spec: *contrato* HTTP `/api/v1` (e `/api/health`). É o ponto mais alto que o app e o MCP já consomem. O e2e atual Hello World **não** é essa seam — precisa de exemplos reais, não de um segundo framework.
- Seam já existente e boa para NLP: testes de serviço do autoavaliador (shadow, promotion, effective alias, quality, replay). Continuar neles para ciclo de promoção, gates de approve e persistência de alias. Não duplicar isso em unitário de controller sem HTTP.
- Prior art de HTTP fino: specs de AccountsController e CategoriesController. Elas hoje **afirmam** get-by-id sem owner. Qualquer teste novo de privacidade é mudança de spec, não “ajuste de cobertura”.
- Prior art de saldo: a regra está no serviço de Transactions; um bom teste de *contrato* é POST create/transfer/credit-payment vs PUT/DELETE e ler `ammount` da Account — sem mockar o recálculo.
- Não usar `pnpm test:e2e` como evidência de rota versionada até o spec deixar de ser Hello World.
- Não exigir cobertura dos JSON de samples de treino; isso já é decisão de treino NLP.

## Out of Scope

- Implementar filtro de owner em `/:id`, recomputar saldo em PUT/DELETE, ou restringir `GET /users`.
- Ligar cron de apply automático, auto-promoção, ou modo automatic que escreve Feedback.
- Trocar grafia `ammount` ou `orrected*` no *contrato*.
- Ativar RabbitMQ, CSRF “de verdade”, CORS restrito, ou DTOs de resposta em toda a API.
- Redesign do app mobile ou das tools MCP — só impacto nomeado se o *contrato* mudar depois.
- Publicar ticket no issue tracker (entrega combinada: `docs/` + Nero).

## Further Notes

Grill (fronteira fechada com evidência de checkout + docs; sem perguntar o que o código já responde):

- Runtime effective **já existe** após apply de alias. CONTEXT e a premissa “até AUTO-034” do playbook estavam stale; foram corrigidos neste review.
- Refresh não amarra o JWT ao valor no banco. Isso é fato, não proposta de sliding session.
- Log de headers no CSRF, CORS `*`, ausência de CancellationToken: débitos observados, não regras.

Perguntas de produto **ainda abertas** (não assumidas nesta spec):

1. `GET/PUT/DELETE /:id` deve passar a 404/403 se a linha não for do JWT?
2. PUT/DELETE de Transaction devem reverter/recomputar saldo?
3. `GET /users` deve existir só para operador, sumir, ou ficar como está?
4. Refresh deve passar a comparar hash persistido + rotação com detecção de reuse?
5. Primeiro login e sessão offline no app (OQ-06/07/09) não cabem nesta spec da API.

Seams: a expectativa adotada é HTTP `/api/v1` como seam de *contrato* e Jest de NLP services como seam de auto-review. Se o time quiser só unitário de controller, esta spec fica subespecificada para saldo e auth.
