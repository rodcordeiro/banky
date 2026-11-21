# Divida Tecnica

Operacao (checkout):

- RabbitMQ conectado no bootstrap, mas `RabbitModule` e `startAllMicroservices()` comentados — tratar como inativo.
- CORS amplo (`origin: '*'`).
- CSRF loga `req.headers` no console.
- `pnpm run build` formata o tree via `prebuild`.
- Antes de mudar NLP/auto-review, ler `activeDecisions` no Nero.

Adequacao vs `$nero` `references/guidelines/api-guidelines.md` (sem reestruturar neste playbook):

- Varios *endpoints* devolvem entidade TypeORM; o guideline pede DTO de resposta.
- `test/app.e2e-spec.ts` e stub (`GET /` Hello World); nao cobre rotas reais.
- DTOs de auth e parte do NLP sem Zod.
- `GET/PUT/DELETE /:id` em accounts, categories e transactions sem *ownership*.
- `GET /users` lista todos os users.
- `CancellationToken` ausente no `src/`.
