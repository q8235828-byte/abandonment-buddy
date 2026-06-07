FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/database ./packages/database

RUN pnpm --filter api build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN pnpm --filter @abandonment-buddy/database db:generate || true

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
