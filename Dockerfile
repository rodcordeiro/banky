FROM node:23-slim AS builder

RUN groupadd -r nonroot \
    && useradd -m -r -g nonroot nonroot

RUN corepack enable && corepack prepare pnpm@latest --activate

USER nonroot

WORKDIR /banky

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

COPY --chown=nonroot:nonroot package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=nonroot:nonroot . .

RUN pnpm run build

EXPOSE 80

CMD ["node", "dist/src/main"]
