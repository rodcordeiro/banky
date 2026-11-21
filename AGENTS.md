# banky-api

API NestJS + Fastify do Banky. Entrada: `src/main.ts`. Prefixo `/api`, versionamento URI `v1`. Dominios em `src/modules` via `SharedModule`.

## Como Usar Este Contexto

| Quando | Ler |
| --- | --- |
| Layout, modulo, camada | `.agents/references/structure.md` |
| Bootstrap, banco, HTTP, cron, RabbitMQ | `.agents/references/runtime.md` |
| Superficies de negocio e risco | `.agents/references/domain.md` |
| Mudar codigo ou validar | `.agents/references/conventions.md` |
| Padroes ja observados | `.agents/references/patterns.md` |
| Gaps e debito vs guideline | `.agents/references/tech-debt.md` |
| *contrato* HTTP, *endpoint* ou DTO | `.agents/skills/banky-api/SKILL.md` |
| Chamadas, imports ou caminho entre simbolos | `$nero-code-graph` (`cg_*`) |
| Guideline de dominio `api` | `$nero` -> `references/guidelines/api-guidelines.md` |

## Regras Rapidas

- Use `$nero` para knowledge deste projeto.
- Controllers na borda HTTP; regras em services; dados em providers.
- Migrations, CI/CD, infra e *contrato* HTTP so com pedido explicito.
- Superficies: JWT, refresh, dados financeiros, logs, New Relic.
- RabbitMQ esta no codigo; `startAllMicroservices()` permanece comentado.
- Validar com `pnpm run lint` e `pnpm run test`. Mudanca de *contrato*: `pnpm run test:e2e`.
- Prefira `pnpm` (`pnpm-lock.yaml`).
- Resposta ao usuario: concisa, analogia simples, acoes que serao executadas.

## Skills Condicionais

- Sempre: `$nero`.
- Estrutura do checkout (*calls*, imports, vizinhos, path): `$nero-code-graph`; corpo de arquivo continua no filesystem.
- *contrato* / *endpoint*: `$banky-api` (`.agents/skills/banky-api/`).
- Guideline Nest/API: `$nero` -> `references/guidelines/api-guidelines.md`.
- `$dotnet-backend-patterns` omitido: checkout e NestJS/TypeScript.
