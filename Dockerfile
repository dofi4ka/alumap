FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Drizzle Studio for the production database (the "studio" service in docker-compose.yml)
FROM deps AS studio
COPY drizzle.config.ts ./
COPY src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
ENV DATABASE_PATH=/data/db.sqlite
EXPOSE 4983
CMD ["pnpm", "drizzle-kit", "studio", "--host", "0.0.0.0", "--port", "4983"]

FROM deps AS build
COPY . .
RUN pnpm build && pnpm prune --prod

# the app, default target
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000 \
    BODY_SIZE_LIMIT=16M
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
COPY drizzle ./drizzle
COPY assets ./assets
COPY scripts ./scripts
VOLUME /data
EXPOSE 3000
CMD ["node", "build"]
