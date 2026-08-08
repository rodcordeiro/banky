# Runtime

Bootstrap:

- `src/main.ts` cria `NestFastifyApplication` com logger Fastify.
- Registra Helmet, compression e CSRF.
- Habilita CORS amplo, shutdown hooks, prefixo global `api` e versionamento URI default `v1`.
- Usa `DataBaseInterceptor` e `BadRequestInterceptor` globais.
- Configura Swagger em `/swagger`.

Banco:

- `src/core/database/database.providers.ts` cria `DataSource` MySQL.
- `synchronize` fica `false`.
- `migrationsRun` fica `true`.
- Tabela de migrations: `bk_tb_migrations`.
- Entidades: `src/**/*.entity.ts`.
- Migrations: `src/core/database/migrations`.

Mensageria e jobs:

- `CronModule` esta ativo no `AppModule`.
- `RabbitModule` esta comentado no `AppModule`.
- `app.connectMicroservice(RABBITMQ_CONFIG)` existe, mas `app.startAllMicroservices()` esta comentado.

Operacao:

- Configuracao vem de `ConfigModule.forRoot({ isGlobal: true })` e `src/common/config/env.config.ts`.
- Nao registrar valores reais de `.env`, tokens ou payloads sensiveis em docs, logs ou testes.
