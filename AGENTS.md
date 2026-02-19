# AGENTS.md

## Escopo
Este guia vale apenas para `banky_api` (API principal).
Antes de editar, confirme se a tarefa pertence a este projeto e nao ao `banky-nlp` ou `banky_app`.

## Stack e Estrutura
- Framework: NestJS + Fastify.
- Persistencia: TypeORM + MySQL.
- Validacao/contratos: Zod (`nestjs-zod`) + Swagger.
- Modulos principais em `src/modules`: `accounts`, `auth`, `categories`, `health`, `parameters`, `payments`, `transactions`, `users`.
- Modulo compartilhado: `src/modules/shared.module.ts`.

## Comandos
Execute dentro de `banky_api/`.

- Instalar dependencias: `pnpm install`
- Desenvolvimento: `pnpm run start:dev`
- Build: `pnpm run build`
- Testes: `pnpm run test`, `pnpm run test:e2e`, `pnpm run test:cov`
- Lint e formatacao: `pnpm run lint`, `pnpm run format`

## Variaveis de Ambiente
- Basear configuracao em `./.env.example`.
- Variaveis criticas: `PORT`, JWT, banco MySQL e RabbitMQ.
- Nunca commitar segredos em `.env`.

## Integracoes e Observacoes
- Existe integracao RabbitMQ no codigo, mas `RabbitModule` esta comentado em `src/app.module.ts`.
- Ao alterar contrato de API (rota/DTO/schema), sincronizar consumidores impactados.

## Diretrizes de Mudanca
- Nao editar `dist/`, `node_modules/` ou arquivos gerados.
- Fazer a menor mudanca possivel, focada no escopo da tarefa.
- Preservar padroes existentes de modulos, naming e injecao de dependencias.

## Validacao Minima Antes de Concluir
1. Rodar `pnpm run lint`.
2. Rodar `pnpm run build` e testes relevantes para a mudanca.
3. Atualizar a versao do projeto quando houver alteracao funcional (semver).
4. Comitar seguindo o padrao de commit adotado no repositorio.

## Referencia Cruzada
Seguir tambem as regras gerais em `../AGENTS.md`.
