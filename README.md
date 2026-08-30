# Rialo Arena

Rialo Arena is a Next.js 16 application backed by PostgreSQL. The supported runtime is Node 24.x, pinned in `.nvmrc` and enforced at runtime.

## Required configuration

Copy `.env.example` to the ignored `.env.local` for local development. Never commit real credentials or limiter secrets.

- `DATABASE_URL`: application PostgreSQL URL.
- `DATABASE_CONNECTION_MODE`: `direct` or `pooled`. Local development uses `direct`.
- `DATABASE_TLS_MODE`: `disable` or `verify-full`. Production must set this explicitly. Use `verify-full` for normal public or hosted PostgreSQL TLS. Use `disable` only for an intentionally trusted private transport.
- `DATABASE_DIRECT_URL`: required by migration, seed, and verification tooling when the application URL is pooled. It must bypass transaction pooling.
- `RATE_LIMIT_HMAC_SECRET`: production-only secret with at least 32 bytes. Rotate deliberately because changing it creates new limiter-key identities.
- `TRUSTED_PROXY_IP_HEADER`: must be exactly `x-real-ip` in production.

Production startup fails if required configuration is missing, malformed, uses the placeholder limiter secret, or runs outside Node 24.x.

## Trusted reverse proxy contract

The application origin must not be directly reachable from the public internet. The one trusted reverse proxy must:

1. Remove any client-supplied `x-real-ip` and `x-forwarded-for` headers.
2. Write one canonical, validated IPv4 or IPv6 address to `x-real-ip`.
3. Forward requests to a network-restricted application origin.
4. Terminate HTTPS before forwarding when the application server itself uses HTTP.

Rialo Arena ignores `x-forwarded-for`. A missing or invalid trusted client IP is placed in one conservative shared limiter bucket rather than bypassing throttling. Persisted IP limiter identifiers are HMAC-SHA-256 values; raw IP addresses are never stored.

## Local development

Use WSL2/Ubuntu with Node 24 from nvm:

```bash
nvm use
npm ci
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:verify
npm run dev
```

The local application defaults to direct PostgreSQL with TLS disabled. Open `http://localhost:3000` unless another port is selected by Next.js.

## Fresh deployment order

Take a restorable database backup before applying migrations, then run:

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run db:verify
npm run build
npm run build:verify
npm run start
```

`db:seed` is idempotent for the canonical 89-question bank. `db:verify` checks the migration sequence, schema invariants, and exact canonical questions. Do not run `db:generate` during deployment.

`drizzle-kit` and `tsx` are devDependencies required by migration, seed, verification, and maintenance commands. If the runtime image omits devDependencies, run those commands in a controlled release/operations stage that includes them before starting the reduced runtime image.

## Maintenance and backups

Schedule `npm run maintenance` at least once per minute. It deletes expired sessions and limiter buckets and settles overdue active quiz attempts through the authoritative quiz engine. It does not delete completed attempt history.

Maintain automated PostgreSQL backups appropriate to the deployment and test restoration regularly. Always capture a backup before schema migrations.

## Verification

Important release checks include:

```bash
npm run lint
npm run typecheck
npm run production:verify
npm run db:fresh:verify
npm run build
npm run build:verify
```

The project currently has four moderate npm audit findings in dev-only `drizzle-kit` tooling through `@esbuild-kit/esm-loader` and `@esbuild-kit/core-utils` to `esbuild`. The available forced audit fix proposes a breaking drizzle-kit downgrade and must not be applied automatically. These packages are not part of the production application runtime when devDependencies are omitted.

## HTTP hardening

Next.js centrally emits frame protection, `nosniff`, a strict referrer policy, a restrictive permissions policy, and production HSTS. `X-Powered-By` is disabled. The CSP is intentionally limited to `frame-ancestors 'none'`; a broader CSP is deferred until nonce or hash behavior is verified against Next.js, GSAP, and current assets.
