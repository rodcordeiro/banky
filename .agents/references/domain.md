# Dominio

API principal do Banky: usuarios/auth, contas e pagamentos, categorias e parametros, transacoes, NLP (parse, feedback, auto-review), health.

Decisao vigente: `banky_nlp` consolidado nesta API; tratar NLP como modulo local ate nova decisao.

Superficies:

- *contrato* HTTP `/api/v1` (skill `$banky-api`);
- persistencia MySQL e migrations;
- JWT e refresh;
- logs, New Relic, interceptors;
- feedbacks e treino NLP.

Cite controller, service, provider ou teste. Sem evidencia, marque hipotese.
