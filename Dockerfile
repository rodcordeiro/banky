FROM node:23-slim AS builder

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

RUN groupadd -r nonroot && useradd -m -r -g nonroot nonroot \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /banky

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN chown -R nonroot:nonroot /banky
USER nonroot

RUN pnpm run build

EXPOSE 3333

CMD ["node", "dist/src/main"]
