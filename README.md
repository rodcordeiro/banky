# Banky API

API principal do Banky, construída com NestJS, Fastify, TypeORM e MySQL.

## Stack

- Runtime: Node.js com TypeScript.
- Framework: NestJS + `@nestjs/platform-fastify`.
- Persistência: TypeORM + MySQL.
- Validação e contratos: Zod com `nestjs-zod` e Swagger.
- Autenticação: Passport/JWT.
- Observabilidade: New Relic.
- Integração assíncrona: RabbitMQ disponível no código, mas microservices não são iniciados no bootstrap atual.

## Estrutura

```text
src/
  common/              # guards, interceptors, utils, schemas e entidades base
  core/                # database, jwt, http, cron, paginate e rabbitmq
  modules/
    accounts/
    auth/
    categories/
    health/
    parameters/
    payments/
    transactions/
    users/
```

Cada módulo tende a seguir o padrão:

```text
controllers/
services/
providers/
entities/
dto/
```

Controllers devem ficar focados em HTTP e delegar regra de negócio para services. Providers são usados como camada de acesso a dados quando o módulo já segue esse padrão.

## Configuração Local

1. Instale as dependências:

```shell
pnpm install
```

2. Crie o arquivo `.env` a partir de `.env.example`:

```shell
cp .env.example .env
```

3. Preencha as variáveis obrigatórias:

```env
NODE_ENV=
HOST=
PORT=

ENC_SECRET=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES=

DB_HOST=
DB_PORT=
DB_USER=
DB_PWD=
DB_NAME=

NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=

RABBIT_URL=
RABBIT_QUEUE=
```

## Execução

```shell
pnpm run start:dev
```

A API usa:

- Prefixo global: `/api`
- Versionamento por URI: `/v1`
- Swagger: `/swagger`

Exemplo local, considerando `PORT=3000`:

```text
http://localhost:3000/swagger
http://localhost:3000/api/v1/health
```

## Scripts

```shell
pnpm run start        # inicia a aplicação
pnpm run start:dev    # inicia em modo watch
pnpm run start:debug  # inicia em modo debug
pnpm run start:prod   # executa o build em dist
pnpm run lint         # executa ESLint com --fix
pnpm run format       # executa Prettier
pnpm run build        # formata e compila
pnpm run test         # testes unitários
pnpm run test:e2e     # testes e2e
pnpm run test:cov     # cobertura de testes
```

Observação: `prebuild` executa `npm run format`, e `preformat` executa `npm run lint`. Apesar disso, o projeto possui `pnpm-lock.yaml`; prefira `pnpm` para comandos manuais.

## Banco de Dados e Migrations

O banco é configurado em `src/core/database/database.providers.ts`.

- Tipo: MySQL.
- `synchronize`: `false`.
- `migrationsRun`: `true`.
- Tabela de migrations: `bk_tb_migrations`.
- Entidades: `src/**/*.entity.ts`.
- Migrations: `src/core/database/migrations`.

Criar migration:

```shell
pnpx typeorm migration:create .\src\core\database\migrations\<MIGRATION_NAME>
```

Não altere migrations já aplicadas sem uma estratégia explícita de compatibilidade e rollback.

## Contratos de API

- DTOs usam Zod com `createZodDto`.
- Swagger é gerado no bootstrap em `src/main.ts`.
- Alterações em rotas, DTOs, schemas, status codes ou payloads JSON devem considerar compatibilidade retroativa.
- Entidades TypeORM não devem ser expostas como contrato público sem necessidade explícita.

## Segurança e Operação

- Não commitar `.env` nem segredos.
- Tratar JWT, refresh token, dados financeiros e dados de usuário como superfície crítica.
- Evitar logs com dados sensíveis, especialmente em interceptors, New Relic e erros de integração.
- RabbitMQ possui módulo e configuração, mas `RabbitModule` está comentado em `src/app.module.ts` e `app.startAllMicroservices()` está comentado em `src/main.ts`.

## Validação Antes de Entregar

```shell
pnpm run lint
pnpm run build
pnpm run test
```

Para mudanças em contrato HTTP, rode também:

```shell
pnpm run test:e2e
```
