# Estrutura

Stack principal:

- Node.js + TypeScript.
- NestJS 10 com Fastify.
- TypeORM + MySQL.
- Zod com `nestjs-zod` e Swagger.
- Passport/JWT, New Relic, cron e dependencias RabbitMQ.

Pastas ativas:

- `src/main.ts`: bootstrap HTTP, seguranca, versionamento, interceptors, Swagger e microservice connection.
- `src/app.module.ts`: modulo raiz e providers globais.
- `src/common/`: guards, interceptors, schemas, entidades base, utils e interfaces.
- `src/core/`: database, cron, HTTP, JWT, paginate e RabbitMQ.
- `src/modules/`: dominios funcionais.
- `src/core/database/migrations/`: migrations TypeORM.
- `test/`: e2e Jest.
- `docs/`: ADRs e backlog tecnico.

Modulos principais:

- `accounts`
- `auth`
- `categories`
- `health`
- `nlp`
- `parameters`
- `payments`
- `transactions`
- `users`

Padrao de modulo observado: `controllers`, `services`, `providers`, `entities` e `dto`.
