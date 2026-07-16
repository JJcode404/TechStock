# TechStock Architecture

## Layering

```
HTTP Request
   │
   ▼
Route (routes/v1/*.routes.ts)
   │  wires middleware in order
   ▼
Middleware
   ├─ requestContext   → attaches requestId, deviceId, ip, userAgent
   ├─ authenticate     → verifies JWT + live session, sets req.user
   ├─ authorize / requirePermission → RBAC + permission gate
   └─ validate(schemas)→ Zod parse of params/query/body (replaces originals)
   │
   ▼
Controller (controllers/*.controller.ts)
   │  thin adapter: read validated input, call service, shape response
   ▼
Service (services/*.service.ts)
   │  ALL business logic; owns transactions; enforces invariants
   ▼
Repository (repositories/*.repository.ts)
   │  the ONLY layer that touches Prisma
   ▼
Prisma → PostgreSQL
```

The error path is centralized: any thrown error (AppError, ZodError, Prisma
error, JWT error, Multer error, or unexpected) is normalized by
`middleware/errorHandler.ts` into the standard `{ success:false, message, errors }`
envelope. Controllers never try/catch for HTTP shaping — they use `asyncHandler`.

## Design principles

- **Single Responsibility** — each module has a validator, repository, service,
  controller and route file with one job each.
- **Dependency Injection** — services/controllers/repositories are classes whose
  collaborators are constructor parameters (defaulting to shared singletons).
  Tests can inject fakes; nothing reaches for a global.
- **Open/Closed** — new modules are added by composing the same layers; the
  request pipeline and error handling don't change.
- **DRY** — cross-cutting concerns live in `utils/` (response envelope, pagination,
  money math, generators) and `middleware/`.
- **Fail fast** — env is validated at boot; invalid config aborts startup.

## The stock ledger (core invariant)

`products.currentStock` is a cached projection of the immutable
`stock_movements` ledger. Every stock change — sale, purchase receipt, return,
cancel, damage, adjustment — goes through **one** primitive:

```ts
applyStockMovement(tx, { productId, type, quantity /* signed */, ... })
```

It runs inside the caller's transaction, uses an atomic row-level
`increment`/`decrement` (no lost updates under concurrency), records
`stockBefore`/`stockAfter`, and rolls the whole transaction back if a sale would
drive stock negative (`InsufficientStockError`). This guarantees the ledger and
the cached count never diverge.

## Money

All monetary math uses `Prisma.Decimal` via `utils/money.ts` (`round2`,
`taxAmount`, `sum`) — never JavaScript floats. Values are stored as
`Decimal(14,2)` and serialized as strings in responses to preserve precision.

## Authentication & sessions

- **Access token**: short-lived JWT with identity + permissions (stateless).
- **Refresh token**: opaque random string; only its SHA-256 hash is stored,
  bound to a `Session`. On each refresh it **rotates** (new token, old one marked
  revoked + `replacedById`). Presenting a revoked token = **reuse detection** →
  the entire user's sessions and tokens are revoked.
- `authenticate` re-checks the session on every request, so logout / forced
  revocation take effect immediately despite stateless access tokens.

## Offline-first sync

Syncable rows carry `updatedAt`, `syncVersion`, `deviceId`, `isDeleted`.
`/sync/pull` returns everything changed since a client watermark (including
tombstones); `/sync/push` applies master-data changes with **last-write-wins**
on `updatedAt`, reporting `applied` / `conflicts` / `rejected`. Protected fields
(stock, balances, loyalty, password) are never client-writable via sync.

## Observability

- **Pino** structured logs; pretty in dev, JSON in prod; secrets redacted.
- **pino-http** request logging tagged with `requestId`.
- `/health/live`, `/health/ready` (DB check), `/health/metrics`.
- `activity_logs` capture an audit trail for security/business actions.
