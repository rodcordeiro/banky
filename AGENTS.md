# banky-api

API NestJS/Fastify do Banky para contas, categorias, pagamentos, transacoes,
usuarios, autenticacao e NLP integrado.

## Como Usar Este Contexto

| Quando | Ler |
| --- | --- |
| Entender layout do repo | `.agents/references/structure.md` |
| Entender bootstrap, banco, HTTP e jobs | `.agents/references/runtime.md` |
| Entender dominio e superficies sensiveis | `.agents/references/domain.md` |
| Mudar codigo ou validar contrato | `.agents/references/conventions.md` |
| Reaproveitar padroes locais | `.agents/references/patterns.md` |
| Avaliar gaps conhecidos | `.agents/references/tech-debt.md` |
| Aplicar guideline Nero | `$nero` -> `references/guidelines/api-guidelines.md` |

## Regras Rapidas

- Use `$nero` para contexto de knowledge deste projeto.
- Preserve controllers finos; regras ficam em services e acesso a dados em providers.
- Nao altere migrations, contratos HTTP, CI/CD ou infraestrutura sem pedido explicito.
- Trate JWT, refresh token, dados financeiros, logs e New Relic como superficies sensiveis.
- RabbitMQ existe no codigo, mas `startAllMicroservices()` esta comentado; nao reative sem decisao explicita.
- Prefira `pnpm`, pois o repo possui `pnpm-lock.yaml`.
- Para respostas ao usuário sobre tarefas, mantenha a resposta concisa e direta, com analogia simples e descritivo das ações que serão executadas.

## Comandos

- `pnpm run start:dev`
- `pnpm run lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run test:e2e` para mudancas em contrato HTTP

## Skills Condicionais

- Sempre: `$nero`.
- Backend API: aplicar `$nero` -> `references/guidelines/api-guidelines.md`.
- .NET nao se aplica: este checkout e NestJS/TypeScript.
