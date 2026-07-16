# TechStock Deployment Guide

## 1. Prerequisites

- Node.js **22+**
- PostgreSQL **14+**, reachable via `DATABASE_URL`
- `pg_dump` / `pg_restore` on PATH (for the backup endpoint)
- A process manager (systemd, PM2) or a container runtime

## 2. Installation

```bash
git clone <repo-url> techstock && cd techstock
npm ci                      # reproducible install from package-lock.json
cp .env.example .env        # fill in real values
```

Generate strong secrets:

```bash
openssl rand -base64 48     # JWT_ACCESS_SECRET
openssl rand -base64 48     # JWT_REFRESH_SECRET
```

## 3. Database setup

```bash
npm run prisma:generate
npm run prisma:deploy       # apply migrations (non-interactive; use in CI/prod)
npm run db:seed             # roles, permissions, admin, settings
```

> After seeding, **log in as the default admin and change the password**, then
> create real users. Consider disabling public `/auth/register` in production.

## 4. Build & run

```bash
npm run build               # → dist/
NODE_ENV=production node dist/server.js
```

### systemd unit (example)

```ini
# /etc/systemd/system/techstock.service
[Unit]
Description=TechStock POS API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/techstock
EnvironmentFile=/opt/techstock/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
User=techstock

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now techstock
```

## 5. Docker (example)

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma && npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# postgresql-client provides pg_dump for the backup endpoint
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
COPY package*.json ./
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

Run migrations against the target DB during release:

```bash
npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

## 6. Reverse proxy

Terminate TLS at nginx/Caddy and forward to the app. The app sets
`trust proxy = 1`, so `X-Forwarded-For` is honored for correct client IPs and
rate limiting. Expose `/api/v1/health/ready` to your load balancer.

## 7. Operational endpoints

- **Health**: `GET /api/v1/health/ready` (503 when DB is down) — use for probes.
- **Metrics**: `GET /api/v1/health/metrics`.
- **Backups**: `POST /api/v1/sync/backup` (Admin) writes to `BACKUP_DIR`.
  Schedule regular backups and ship them off-host.

## 8. Security checklist

- [ ] Unique, 48-byte `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- [ ] `CORS_ORIGINS` set to your real front-end origins (no `*`).
- [ ] `NODE_ENV=production` (hides internal error details & stack traces).
- [ ] Default admin password changed; `/auth/register` locked down.
- [ ] TLS enforced at the proxy; DB connection uses TLS where possible.
- [ ] Backups scheduled and tested (`pg_restore`).
- [ ] Log aggregation configured (JSON logs → your shipper).

## 9. Dependency audit note

Production dependencies are clean. The remaining `npm audit` advisories are in
the **dev-only** `vitest`/`esbuild` toolchain and do not ship to production.
Resolving them requires a major bump to `vitest@4`:

```bash
npm i -D vitest@^4 @vitest/coverage-v8@^4
```

Validate the suite (`npm test`) after upgrading.

## 10. Upgrades

```bash
git pull
npm ci
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npm run build
sudo systemctl restart techstock   # or redeploy the container
```
