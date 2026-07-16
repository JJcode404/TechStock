# TechStock — Offline-First POS Backend

TechStock is a production-ready, offline-first Point of Sale (POS) and inventory
management backend built for networking, CCTV, computer, and electronics stores.
It manages products, inventory, sales, purchases, customers, suppliers, payments,
expenses and reporting — with first-class support for offline devices that
synchronize when back online.

Built with **Node.js 22 + TypeScript**, **Express**, **PostgreSQL**, **Prisma**,
**Zod**, and **JWT** authentication, following **Clean Architecture** and the
**Repository → Service → Controller** pattern.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [API Overview](#api-overview)
- [Offline Sync](#offline-sync)
- [Security](#security)
- [Documentation](#documentation)

---

## Features

**Catalog & Inventory**
- Products with SKU, barcode (EAN-13), QR code, serial number, brand, location,
  4 price tiers (buying / selling / wholesale / dealer), tax, and stock levels.
- Automatic SKU and barcode generation.
- Product image uploads (Multer).
- Full stock-movement ledger — every stock change is recorded and reversible.
- Manual inventory adjustments (stock counts, damage, theft, expiry…).
- Low-stock and out-of-stock reporting; live stock valuation.

**Point of Sale**
- Create sales with per-line price tiers, discounts and tax.
- Automatic stock deduction with insufficient-stock protection.
- Multi-tender payments (cash, card, mobile money, bank transfer, credit).
- Receipt & invoice number generation; formatted receipts.
- Cancel and (partial) return flows that reverse stock and balances.
- Cost-of-goods captured per sale for accurate profit reporting.

**Purchasing**
- Purchase order lifecycle: DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED.
- Receiving increases inventory and updates supplier balances & cost prices.

**Customers & Suppliers**
- CRUD, purchase history, outstanding balances, and customer loyalty points.

**Reporting**
- Dashboard, today/monthly sales & profit, sales time-series, top-selling and
  most-profitable products, recent sales, and profit reports (with expenses).

**Platform**
- Role-based (Admin / Manager / Cashier) + fine-grained permission authorization.
- JWT access tokens + rotating, revocable refresh tokens with reuse detection.
- Structured logging (Pino), global error handling, request validation (Zod).
- Health, readiness, and metrics endpoints.
- Database backup endpoint (`pg_dump`), audit/activity logs.
- Offline sync (pull/push) with last-write-wins conflict resolution.

---

## Architecture

TechStock follows **Clean Architecture** with strict layering. Each request flows:

```
Route → Validation (Zod) → Controller → Service → Repository → Prisma → PostgreSQL
```

- **Controllers** are thin HTTP adapters — no business logic.
- **Services** contain all business logic and own transactions.
- **Repositories** are the only layer that talks to Prisma.
- **Validators** (Zod) guard every endpoint; nothing untrusted reaches a service.
- **Dependency Injection** via constructor parameters makes every layer testable
  (each class accepts its collaborators, defaulting to shared singletons).

The single source of truth for stock is the **stock-movement ledger**: sales,
purchases, returns, damages and adjustments all flow through one transaction-safe
primitive (`applyStockMovement`), so `products.currentStock` is always
reconstructable and never drifts.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Tech Stack

| Concern         | Choice                                    |
| --------------- | ----------------------------------------- |
| Language        | TypeScript (strict)                       |
| Runtime         | Node.js 22+                               |
| Framework       | Express 4                                 |
| Database        | PostgreSQL                                |
| ORM             | Prisma 5                                  |
| Validation      | Zod                                       |
| Auth            | JWT access + rotating refresh, bcrypt     |
| Logging         | Pino / pino-http                          |
| Security        | Helmet, CORS, rate limiting, input valid. |
| Uploads         | Multer                                    |
| Testing         | Vitest                                    |
| Package manager | npm                                       |

---

## Project Structure

```
src/
├── app.ts                 # Express app factory (middleware + routes wiring)
├── server.ts              # Process lifecycle: connect DB, listen, graceful shutdown
├── config/                # env validation (Zod) + Pino logger
├── constants/             # roles, permissions, HTTP codes, doc prefixes
├── database/              # PrismaClient singleton
├── errors/                # AppError hierarchy
├── middleware/            # auth, RBAC, validation, rate limit, error handler, upload
├── controllers/           # thin HTTP adapters (one per module)
├── services/              # business logic (one per module)
├── repositories/          # Prisma data-access (one per module)
├── validators/            # Zod schemas (one per module)
├── routes/v1/             # versioned route definitions + aggregator
├── prisma/                # schema.prisma + migrations
├── utils/                 # response envelope, jwt, crypto, money, generators…
├── types/                 # Express augmentation + shared types
└── logs/
prisma/seed.ts             # RBAC + admin + settings seed
tests/                     # Vitest unit tests
docs/                      # API, deployment, database, architecture docs
```

---

## Getting Started

### Prerequisites

- Node.js **22+**
- PostgreSQL **14+** (with `pg_dump` on PATH for the backup endpoint)
- npm **10+**

### Install

```bash
git clone <repo-url> techstock
cd techstock
npm install
cp .env.example .env      # then edit .env with your values
```

### Configure the database

Create a database and set `DATABASE_URL` in `.env`:

```bash
createdb techstock
# DATABASE_URL=postgresql://user:password@localhost:5432/techstock?schema=public
```

### Migrate & seed

```bash
npm run prisma:generate     # generate the Prisma client
npm run prisma:migrate      # apply migrations (dev)
npm run db:seed             # roles, permissions, admin user, settings
```

The seed creates a default admin:

```
email:    admin@techstock.local
password: Admin@12345      ← change this immediately in any real deployment
```

---

## Environment Variables

All configuration is validated at startup (`src/config/env.ts`) — the app
refuses to boot on invalid config. See [.env.example](.env.example) for the full,
documented list. Key variables:

| Variable                 | Description                              | Default        |
| ------------------------ | ---------------------------------------- | -------------- |
| `NODE_ENV`               | `development` / `test` / `production`    | `development`  |
| `PORT`                   | HTTP port                                | `4000`         |
| `API_PREFIX`             | API base path                            | `/api/v1`      |
| `DATABASE_URL`           | PostgreSQL connection string             | —              |
| `JWT_ACCESS_SECRET`      | Access-token secret (≥32 chars)          | —              |
| `JWT_REFRESH_SECRET`     | Refresh-token secret (≥32 chars)         | —              |
| `JWT_ACCESS_EXPIRES_IN`  | Access-token TTL                         | `15m`          |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token TTL                        | `7d`           |
| `BCRYPT_SALT_ROUNDS`     | bcrypt cost                              | `12`           |
| `CORS_ORIGINS`           | Comma-separated allowed origins          | localhost      |
| `RATE_LIMIT_MAX`         | Requests / window (global)               | `300`          |
| `LOG_LEVEL`              | Pino level                               | `info`         |

---

## Database

- 21 models covering the full POS domain (see
  [docs/DATABASE.md](docs/DATABASE.md) for the ER diagram and table reference).
- UUID primary keys, `createdAt`/`updatedAt`, soft-delete (`isDeleted`/
  `deletedAt`) where appropriate, and offline-sync fields (`syncVersion`,
  `deviceId`) on every syncable table.
- Money stored as `Decimal(14,2)` — never floats.
- Indexed for the common access paths (lookups, listing, reporting).

Common commands:

```bash
npm run prisma:studio       # browse data
npm run prisma:migrate      # create/apply a migration (dev)
npm run prisma:deploy       # apply migrations (production/CI)
```

---

## Running the App

```bash
npm run dev        # hot-reloading dev server (tsx watch)
npm run build      # compile TypeScript to dist/
npm start          # run the compiled server (dist/server.js)
npm run typecheck  # type-check without emitting
```

Verify it's up:

```bash
curl http://localhost:4000/api/v1/health/ready
```

---

## Testing

```bash
npm test               # run the Vitest suite once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

> Note: the dev-only `vitest`/`esbuild` toolchain has advisories that require a
> major bump (`vitest@4`); production dependencies are clean. See the audit note
> in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## API Overview

Base URL: `http://<host>:<port>/api/v1`

All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "message": "…", "data": { }, "meta": { } }
// error
{ "success": false, "message": "…", "errors": [ { "field": "…", "message": "…" } ] }
```

Authenticate with `Authorization: Bearer <accessToken>`. Offline clients send
`X-Device-Id` for sync attribution and `X-Request-Id` for tracing.

| Area          | Base path              |
| ------------- | ---------------------- |
| Auth          | `/auth`                |
| Categories    | `/categories`          |
| Suppliers     | `/suppliers`           |
| Products      | `/products`            |
| Inventory     | `/inventory`           |
| Sales / POS   | `/sales`               |
| Purchases     | `/purchase-orders`     |
| Customers     | `/customers`           |
| Expenses      | `/expenses`            |
| Reports       | `/reports`             |
| Sync & Backup | `/sync`                |
| Health        | `/health`              |

Full endpoint reference: **[docs/API.md](docs/API.md)**.

### Quick example

```bash
# Log in
curl -sX POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"Admin@12345"}'

# Create a product (auto SKU + barcode)
curl -sX POST http://localhost:4000/api/v1/products \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Dell XPS 15","sellingPrice":250000,"buyingPrice":200000,
       "taxRate":16,"currentStock":10,"minStock":3,"generateBarcode":true}'
```

---

## Offline Sync

Every syncable record carries `updatedAt`, `syncVersion`, `deviceId` and
`isDeleted`. Offline clients:

- **Pull** changes since a watermark: `GET /sync/pull?since=<ISO>&entities=products,customers`
- **Push** local master-data changes: `POST /sync/push` — the server applies a
  **last-write-wins** strategy keyed on `updatedAt`, returning `applied`,
  `conflicts` (server copy was newer) and `rejected` batches.

Transactional data (sales, stock) is created through its own endpoints and
pulled read-only, keeping the ledger authoritative.

---

## Security

- **Passwords**: bcrypt (cost 12).
- **Access tokens**: short-lived JWTs (identity + permissions).
- **Refresh tokens**: opaque, hashed at rest, **rotated** on every use with
  **reuse detection** that revokes the whole session family.
- **Session validation** on every authenticated request (instant revocation).
- **RBAC** + fine-grained permissions on every mutating route.
- **Helmet**, **CORS** allowlist, **global + auth rate limiting**.
- **Zod** validation on all inputs; **Prisma** parameterizes all queries.
- Secrets and tokens **redacted** from logs.

---

## Documentation

- [docs/API.md](docs/API.md) — full endpoint reference
- [docs/DATABASE.md](docs/DATABASE.md) — ER diagram & schema reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering & design decisions
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — installation & deployment guide

---

## License

Proprietary — © TechStock. All rights reserved.
