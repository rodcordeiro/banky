# Divida Tecnica

- `RabbitModule` esta comentado no modulo raiz e `startAllMicroservices()` tambem; a integracao RabbitMQ deve ser tratada como configurada, mas nao ativa.
- CORS esta amplo no bootstrap; revisar antes de exposicao publica ou ambiente sensivel.
- O hook CSRF registra headers no console no checkout atual; cuidado para nao vazar dados sensiveis em logs.
- `pnpm run build` pode formatar arquivos por causa dos scripts `prebuild`/`preformat`; validar escopo do diff depois de rodar.
- O knowledge anterior ainda tem notas historicas de NLP; prefira `activeDecisions` do MCP Nero antes de alterar fluxo.
