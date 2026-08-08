# Dominio

O `banky-api` e a API principal do Banky. A superficie funcional cobre:

- usuarios e autenticacao;
- contas e formas de pagamento;
- categorias e parametros;
- transacoes financeiras;
- NLP para classificacao, feedback e autoavaliacao;
- healthcheck e operacao de background.

Superficies sensiveis:

- contratos HTTP versionados em `/api/v1`;
- DTOs Zod e Swagger;
- persistencia financeira em MySQL;
- migrations e indices;
- JWT e refresh token;
- logs, New Relic e interceptors;
- fluxo NLP e feedbacks usados para treinamento.

Decisao vigente no knowledge:

- `banky_nlp` foi consolidado dentro de `banky-api`; trate NLP como parte da API principal ate nova decisao.

Nao invente regra financeira. Sem evidencia em controller/service/provider/teste, registre como hipotese ou deixe fora.
