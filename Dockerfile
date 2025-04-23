FROM node:23-slim AS builder

# Habilita compilação de bindings nativos
RUN apt-get update && apt-get install -y python3 make g++ \
    && groupadd -r nonroot && useradd -m -r -g nonroot nonroot

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

WORKDIR /banky

USER nonroot

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --chown=nonroot:nonroot package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=nonroot:nonroot . .

RUN pnpm run build

EXPOSE 80

CMD ["node", "dist/src/main"]


