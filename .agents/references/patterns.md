# Padroes Locais

NestJS:

- Modulos por dominio em `src/modules/<domain>`.
- Controllers delegam para services.
- Providers fazem papel de repositorio/acesso a dados quando ja existe esse padrao.
- DTOs usam Zod e `createZodDto`.

TypeORM:

- Filtros por relacao `owner` devem usar objeto relacional quando aplicavel, por exemplo `owner: { id: ownerId }`.
- Migrations novas ficam em `src/core/database/migrations`.
- Nao ajustar migration ja aplicada sem plano de compatibilidade e rollback.

NLP:

- Resolver sinais explicitos de conta/categoria com dados persistidos antes de classificador probabilistico quando o fluxo existente permitir.
- Escopar por owner quando disponivel para evitar misturar dados entre usuarios.

ESLint TypeScript:

- Usar `@typescript-eslint/no-unused-vars`; nao habilitar tambem a regra base `no-unused-vars`.
