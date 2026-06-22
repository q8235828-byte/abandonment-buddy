FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.5.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/

RUN pnpm install --no-frozen-lockfile

COPY apps/api ./apps/api
COPY packages/database ./packages/database

RUN pnpm --filter api build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@11.5.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/

RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY plugins ./plugins

RUN pnpm --filter @abandonment-buddy/database db:generate || true

EXPOSE ${PORT:-3001}

CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && node apps/api/dist/main"]
