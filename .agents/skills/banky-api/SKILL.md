---
name: banky-api
description: >
  Resolve *contrato* HTTP da banky_api (*endpoint*, auth, DTO, status).
  Use when integrating a consumer, changing a *rota* or DTO, or checking expected API behavior — even if the user names a module (auth, accounts, NLP) instead of "endpoint".
---

# banky-api

*Contrato* HTTP da API principal. Checkout em `src/modules/**/controllers` e DTOs Zod/Swagger prevalece sobre esta skill.

## Fluxo

1. Escreva o módulo e o *endpoint* (método + path). **Done:** os dois estão nomeados.
2. Abra só o arquivo da branch:
   - CRUD / auth / health → [references/endpoints.md](references/endpoints.md) (índice no topo)
   - NLP / auto-review → [references/nlp.md](references/nlp.md)
   - termo de domínio → [references/glossary.md](references/glossary.md)
   **Done:** a linha do *endpoint* (ou o termo) está no contexto.
3. Leia auth, body/query, status e comportamento nessa linha. **Done:** a resposta cita esses campos.
4. Se o checkout divergir, cite o controller/DTO em `src/modules`. **Done:** o arquivo citado existe.
5. Se o *contrato* mudar: nomeie impacto em `banky_app` / `bany_mcp` e rode `pnpm run test:e2e`. **Done:** impacto nomeado e comando executado ou marcado N/A.

Prefixo, Swagger e versionamento URI: `.agents/references/runtime.md`. Camadas HTTP: `.agents/references/conventions.md`.

## Gotchas

- *ammount* — grafia do saldo em Account é o *contrato*.
- *orrected* — keys JSON de review NLP (`orrectedOriginAccount`, `orrectedCategory`).
- *ownership* — `GET/PUT/DELETE /:id` em accounts, categories e transactions não filtra owner.
- *saldo* — `ammount` muda só em `POST /transactions`, `/transfer` e `/credit-payment`.

Cite controller, DTO ou a linha da referência; sem isso, marque hipótese.

## Manutenção

Atualize o `.md` da branch quando o controller/DTO mudar. O quality bar do app fica em `banky_app/.agents/skills/banky-api/`; não forke o catálogo.
