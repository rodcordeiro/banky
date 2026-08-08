# Convencoes

Mudancas:

- Leia `README.md`, `AGENTS.md` e o modulo afetado antes de editar.
- Mantenha controller na borda HTTP: decorators, guards, validacao, chamada de service e resposta.
- Coloque regra de negocio em services.
- Mantenha acesso a dados nos providers ou padrao equivalente ja usado pelo modulo.
- Nao exponha entidade TypeORM como contrato publico sem motivo explicito.
- Ao alterar rota, DTO, schema, status code ou payload JSON, registre impacto de compatibilidade.
- Nao altere migrations aplicadas, CI/CD, Docker ou infraestrutura sem pedido explicito.

Comandos:

- `pnpm run lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run test:e2e` para contrato HTTP

Observacoes:

- `pnpm run build` aciona formatacao via scripts existentes.
- Evite rodar comandos que reescrevem muitos arquivos fora do escopo da tarefa.
- Nao editar `dist/`, `coverage/` ou `node_modules/`.
