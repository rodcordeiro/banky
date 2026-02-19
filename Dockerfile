FROM node:22-slim AS base

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

WORKDIR /banky

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build

COPY . .
RUN pnpm run build

FROM node:22-slim AS runner

ENV NODE_ENV=production
ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

WORKDIR /banky

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=build /banky/dist ./dist

USER node

EXPOSE 3333

CMD ["node", "dist/src/main"]
