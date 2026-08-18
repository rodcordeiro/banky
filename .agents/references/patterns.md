# Padroes Locais

Nest:

- Um modulo por dominio em `src/modules/<domain>`.
- Controller delega; provider isola TypeORM quando o modulo ja usa esse corte.
- DTO de escrita: Zod + `createZodDto` quando o arquivo ja segue isso.

TypeORM:

- Filtro `owner` com `{ owner: { id: ownerId } }`, nao `{ owner: ownerId }`.
- Migration nova em `src/core/database/migrations`; nao reescrever migration aplicada.

NLP:

- Resolver conta/categoria persistida antes do classificador, no fluxo que ja faz isso.
- Escopar por owner.

ESLint:

- So `@typescript-eslint/no-unused-vars`; nao ligar tambem `no-unused-vars`.
