FROM node:23-slim AS builder

RUN groupadd -r nonroot \
    && useradd -m -r -g nonroot nonroot

USER nonroot

WORKDIR /banky

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

COPY . .

RUN npm ci --ignore-scripts \
    && npm run build

EXPOSE 80

CMD [ "node", "dist/src/main" ]
