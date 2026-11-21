# Referencias banky-api

| Arquivo | Quando ler |
| --- | --- |
| `structure.md` | Antes de localizar modulo, camada ou teste. |
| `runtime.md` | Antes de mexer em bootstrap, banco, HTTP, Swagger, cron ou RabbitMQ. |
| `domain.md` | Antes de alterar regra de negocio ou superficie financeira/NLP. |
| `conventions.md` | Antes de implementar, testar ou validar entrega. |
| `patterns.md` | Para seguir padroes locais ja observados. |
| `tech-debt.md` | Gaps vs guideline e riscos sem refatorar fora de escopo. |

*contrato* HTTP: `$banky-api` -> `.agents/skills/banky-api/SKILL.md`.

Guideline: dominio `api` -> `$nero` -> `references/guidelines/api-guidelines.md`.

Estrutura (`calls`, imports, vizinhos e paths): `$nero-code-graph` (`cg_*`). Corpo e WIP: filesystem.
