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
- Padrao local: `controllers`, `services`, `providers`, `entities` e `dto` dentro de cada modulo.
- Providers fazem o papel de acesso a dados/repositorios quando o modulo ja usa esse padrao.

## Comandos
Execute dentro de `banky_api/`.

- Instalar dependencias: `pnpm install`
- Desenvolvimento: `pnpm run start:dev`
- Build: `pnpm run build`
- Testes: `pnpm run test`, `pnpm run test:e2e`, `pnpm run test:cov`
- Lint e formatacao: `pnpm run lint`, `pnpm run format`
- Migration TypeORM: `pnpx typeorm migration:create .\src\core\database\migrations\<MIGRATION_NAME>`
- Preferir `pnpm`/`pnpx` para scripts JavaScript/TypeScript, mantendo coerencia com `pnpm-lock.yaml`.

## Variaveis de Ambiente
- Basear configuracao em `./.env.example`.
- Variaveis criticas: `PORT`, JWT, banco MySQL e RabbitMQ.
- Nunca commitar segredos em `.env`.

## Integracoes e Observacoes
- Existe integracao RabbitMQ no codigo, mas `RabbitModule` esta comentado em `src/app.module.ts`.
- Ao alterar contrato de API (rota/DTO/schema), sincronizar consumidores impactados.

## Diretrizes de API e Backend
- Controllers devem permanecer enxutos: roteamento, decorators, guards, validacao de entrada e chamada de service.
- Regras de negocio devem ficar em services; nao espalhar regra de dominio em controllers, DTOs ou providers.
- Acesso a dados deve ficar isolado em providers/repositorios ou camada equivalente ja usada pelo modulo.
- DTOs e schemas Zod sao o contrato publico de entrada/saida; nao vazar entidades TypeORM sem necessidade explicita.
- Ao criar ou alterar DTO/schema, manter Swagger sincronizado e validar exemplos, obrigatoriedade, tipos e nullability.
- Ao alterar endpoints, registrar impacto em rota, metodo HTTP, status code, payload JSON, erros e compatibilidade retroativa.
- Mudancas quebraveis de contrato exigem estrategia explicita de compatibilidade, migracao ou rollback.
- Tratar autenticacao, autorizacao, JWT, dados financeiros e dados sensiveis como superficie critica de seguranca.
- Nao introduzir dependencia npm/NuGet ou servico externo sem justificar custo operacional, risco e alternativa simples.

## Persistencia e Integracoes
- Nao alterar migrations, schema de banco, seed ou infraestrutura sem solicitacao explicita.
- Em TypeORM, preservar entidades, relacionamentos e nomes de colunas existentes salvo mudanca de dominio validada.
- Ao mudar consultas ou persistencia, avaliar impacto em transacao, consistencia financeira, performance e indices.
- RabbitMQ deve permanecer desativado em `app.module.ts` ate haver solicitacao explicita para reativar ou redesenhar a integracao.
- New Relic e demais observabilidades nao devem expor dados sensiveis em logs, traces ou mensagens de erro.

## Diretrizes de Mudanca
- Nao editar `dist/`, `node_modules/` ou arquivos gerados.
- Fazer a menor mudanca possivel, focada no escopo da tarefa.
- Preservar padroes existentes de modulos, naming e injecao de dependencias.
- Nao alterar contratos publicos, migrations, CI/CD ou infraestrutura como efeito colateral.
- Antes de editar, ler o contexto essencial: `README.md`, este `AGENTS.md` e os modulos afetados.
- Nao alterar arquivos de teste sem solicitacao explicita; quando precisar validar comportamento, prefira adicionar testes focados apenas se o escopo pedir.
- Comentarios de codigo devem ser curtos e uteis; evitar narrar codigo obvio.

## Validacao Minima Antes de Concluir
1. Rodar `pnpm run lint`.
2. Rodar `pnpm run build` e testes relevantes para a mudanca.
3. Atualizar a versao do projeto quando houver alteracao funcional (semver).
4. Comitar seguindo o padrao de commit adotado no repositorio.

## Referencia Cruzada
Seguir tambem as regras gerais em `../AGENTS.md`.
