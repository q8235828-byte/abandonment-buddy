# Abandonment Buddy

A SaaS platform for recovering WooCommerce abandoned carts via automated email, WhatsApp, and SMS campaigns.

## Overview

Abandonment Buddy integrates with WooCommerce stores via webhooks. When a customer leaves without completing checkout, the system detects the abandonment and triggers multi-channel recovery messages based on your campaign configuration.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16, Prisma ORM |
| Queue | BullMQ + Redis 7 |
| Email (dev) | Mailpit |
| Monorepo | pnpm + Turborepo |

## Project Structure

```
abandonment-buddy/
├── apps/
│   ├── api/          # NestJS REST API (port 3001)
│   └── web/          # Next.js dashboard (port 3000)
└── packages/
    └── database/     # Prisma schema
```

## Prerequisites

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io) v10
- [Docker](https://www.docker.com) (for PostgreSQL, Redis, Mailpit)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Mailpit** (SMTP on `1025`, web UI on `8025`)

### 3. Configure environment

Copy the example env file and update values as needed:

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/abandonment_buddy"
JWT_SECRET="super_secret_change_this"
PORT=3001
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Run database migrations

```bash
cd packages/database
pnpm db:migrate
pnpm db:generate
```

### 5. Start development servers

```bash
pnpm dev
```

Both the API and web app start in watch mode.

| Service | URL |
|---|---|
| Web dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger docs | http://localhost:3001/docs |
| Mailpit UI | http://localhost:8025 |

## How It Works

### 1. Connect a store

1. Sign up and log in to the dashboard.
2. Go to **Stores** and create a new store (name + WooCommerce domain).
3. Copy the generated API key, API secret, and webhook URL.
4. In WooCommerce, install the plugin and paste the credentials.
5. Click **Connect** — the store status changes to `CONNECTED`.

### 2. Configure a campaign

Go to **Campaigns**, select your store, and configure:
- Which channels to enable (Email, WhatsApp, SMS)
- Delay per channel (minutes before sending)
- Message templates using tokens like `{{customerName}}`, `{{cartValue}}`, `{{checkoutLink}}`

### 3. Detect abandoned carts

The system marks an order as abandoned when:
- WooCommerce sends a webhook with status `pending`, `on-hold`, or `failed`
- The order is older than the store's **abandonment timeout** (default: 60 minutes)

Run detection manually from the dashboard, or automate it with a cron job hitting `POST /abandonment/check`.

### 4. Recovery emails

Once an order is marked `DETECTED`, a job is queued in BullMQ. The worker picks it up and sends a recovery email. In development, emails are captured by Mailpit at http://localhost:8025.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/stores` | JWT | List user's stores |
| POST | `/stores` | JWT | Create store |
| POST | `/stores/connect` | JWT | Connect WooCommerce plugin |
| GET | `/webhooks/health/:storeId` | Public | Webhook health check |
| POST | `/webhooks/woocommerce/:storeId` | Public | Receive WooCommerce events |
| POST | `/abandonment/check` | JWT | Run abandonment detection |
| GET | `/abandonment/orders` | JWT | List abandoned orders |
| GET | `/campaigns/:storeId` | JWT | Get campaign config |
| POST | `/campaigns/:storeId` | JWT | Save campaign config |
| GET | `/dashboard/stats` | JWT | Get recovery stats |

Full interactive docs: http://localhost:3001/docs

## Database Schema

```
User
 └── Store (many)
      ├── AbandonedOrder (many)   — status: DETECTED | RECOVERED | EXPIRED
      └── Campaign                — email/whatsapp/sms config + templates
```

## Scripts

### Start individually

```bash
# Database, Redis, and Mailpit (Docker)
docker compose up -d

# API only (from repo root)
pnpm --filter api start:dev

# Web only (from repo root)
pnpm --filter web dev
```

Or from within each app directory:

```bash
# API
cd apps/api && pnpm start:dev

# Web
cd apps/web && pnpm dev
```

### All at once

```bash
pnpm dev       # starts API + web concurrently via Turborepo
```

### Other commands

| Command | Description |
|---|---|
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format with Prettier |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma client |
