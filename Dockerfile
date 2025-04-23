
FROM node:23-slim AS builder

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

# Instala ferramentas para compilar bcrypt
RUN apt-get update && apt-get install -y python3 make g++ \
    && groupadd -r nonroot && useradd -m -r -g nonroot nonroot

# Ativa corepack e pnpm ainda como root
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /banky

# Copia arquivos e instala deps com permissões adequadas
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copia o restante da app
COPY . .

# Ajusta permissões e troca para nonroot
RUN chown -R nonroot:nonroot /banky
USER nonroot

RUN pnpm run build

EXPOSE 80
CMD ["node", "dist/src/main"]
