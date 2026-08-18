# Convencoes

Mudanca:

- Leia o modulo afetado e, se for *contrato* HTTP, `$banky-api`.
- Controller: rota, decorator, guard, pipe, chamada de service, resposta.
- Regra de negocio em services; dados nos providers do modulo.
- Entidade TypeORM como response so quando o *contrato* atual ja e assim.
- Rota, DTO, status ou JSON: registrar impacto em `banky_app` / `bany_mcp`.
- Migration aplicada, CI/CD, Docker ou infra: so com pedido explicito.

Validacao (scripts em `package.json`):

- `pnpm run lint`
- `pnpm run test`
- `pnpm run test:e2e` para *contrato* HTTP
- `pnpm run build` dispara `preformat`/`format`; conferir o diff depois

Nao editar `dist/`, `coverage/` ou `node_modules/`.
