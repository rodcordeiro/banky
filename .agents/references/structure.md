# Estrutura

Stack observada: Node.js + TypeScript, NestJS 10 + Fastify, TypeORM + MySQL, Zod/`nestjs-zod`, Swagger, Passport/JWT, New Relic, cron. RabbitMQ nas dependencias.

Entrada: `src/main.ts`. Raiz: `src/app.module.ts`. Dominios montados em `src/modules/shared.module.ts`.

| Path | Papel |
| --- | --- |
| `src/modules/` | Dominios: accounts, auth, categories, health, nlp, parameters, payments, transactions, users |
| `src/common/` | Guards, interceptors, schemas, entidade base, utils, `env.config.ts` |
| `src/core/` | Database, cron, HTTP, JWT, paginate, RabbitMQ |
| `src/core/database/migrations/` | Migrations TypeORM (`bk_tb_migrations`) |
| `test/` | Jest e2e (`app.e2e-spec.ts`) |
| `.agents/skills/banky-api/` | Domain Skill de *contrato* HTTP |
| `docs/` | Playbook/backlog auto-review e ADR de treino NLP |

Padrao de modulo observado: `controllers/`, `services/`, `providers/`, `entities/`, `dto` ou `dtos/`.

O README omite `nlp` na arvore; o checkout inclui `NlpModule` no `SharedModule`.
