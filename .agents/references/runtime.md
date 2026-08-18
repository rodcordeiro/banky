# Runtime

Bootstrap (`src/main.ts`):

- `NestFastifyApplication` com logger Fastify; import `newrelic`.
- Helmet, compression, CSRF (`csrf-token`); CORS `origin: '*'`.
- Prefixo `api`, versionamento URI default `v1`, shutdown hooks.
- Interceptors globais: `DataBaseInterceptor`, `BadRequestInterceptor`.
- Swagger em `/swagger`.
- `connectMicroservice(RABBITMQ_CONFIG)`; `startAllMicroservices()` comentado.

`AppModule`:

- `ConfigModule.forRoot({ isGlobal: true })`; env validado em `src/common/config/env.config.ts` (Zod).
- `ZodValidationPipe` global; `ThrottlerGuard` 10 req / 30 s.
- `DatabaseModule`, `CronModule`, `PassportModule`, `NestJwtModule`, `SharedModule`.
- `RabbitModule` comentado.

Banco (`src/core/database/database.providers.ts`): MySQL, `synchronize: false`, `migrationsRun: true`, entidades `src/**/*.entity.ts`.

Nao registrar valores reais de `.env`, tokens ou payloads sensiveis.
