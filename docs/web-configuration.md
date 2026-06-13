# Web App Configuration (`@ash/web`)

How to run the ash Workbench web app and what every environment variable means.

## What the web app talks to

The browser only ever calls **same-origin** Next.js routes. Two server-side
integrations sit behind those routes:

```
browser ──▶ Next.js (apps/web)
              ├─ /api/auth/*            ──▶ iam        (auth service)    IAM_BASE_URL
              └─ /api/praxis/[...]  (BFF) ──▶ praxis    (task execution)  PRAXIS_BASE_URL
```

- **iam** issues/refreshes JWTs; the web app stores them in httpOnly cookies.
- **praxis** runs tasks and streams `RuntimeEvent`s over SSE. The BFF route attaches
  the iam JWT as a `Bearer` header and forwards to praxis (it never reaches the browser).

The app ships a **fake praxis client by default**, so it runs fully standalone (no
backends) for demos and local UI work. Switch to the real backends with the env vars below.

## Prerequisites

- Node.js (LTS) and **pnpm 10.33.2** (`packageManager` in the root `package.json`).
- `pnpm install` at the repo root (Turborepo workspace).

## Commands

Run from the repo root (Turborepo) or per package:

```bash
pnpm install                      # install workspace deps
pnpm dev                          # turbo: dev for all packages
pnpm --filter @ash/web dev        # web only (Next + Turbopack) → http://localhost:3000
pnpm --filter @ash/web build      # production build
pnpm --filter @ash/web start      # serve the production build
pnpm --filter @ash/web lint
pnpm --filter @ash/web typecheck
pnpm --filter @ash/web test       # vitest
pnpm --filter @ash/web gen:praxis # regenerate praxis types from the vendored OpenAPI
```

The dev server listens on **port 3000** by default (standard Next.js; override with `PORT`).

## Environment variables

The web app reads exactly four variables. Place them in **`apps/web/.env.local`**
(Next.js loads `.env.local` automatically; it is gitignored).

| Variable | Scope | Required | Default | Meaning |
|---|---|---|---|---|
| `NEXT_PUBLIC_PRAXIS_TRANSPORT` | Client (browser) | No | `fake` | Selects the praxis client. `fake` = local scripted fixture, no network. `http` = real transport via the BFF. Any other value falls back to `fake`. **`NEXT_PUBLIC_`** ⇒ inlined at build time. |
| `PRAXIS_BASE_URL` | Server only | Only in `http` mode | `http://localhost:8091` | Base URL of the praxis backend the BFF (`/api/praxis/...`) forwards to. Server-only — never exposed to the browser. |
| `IAM_BASE_URL` | Server only | Recommended | `http://localhost:8090` | Base URL of the iam auth service. The iam client calls `${IAM_BASE_URL}/v1/apps/ash` (the app is scoped under `apps/ash`). Server-only. |
| `NODE_ENV` | Both | Set by tooling | `development` (dev) / `production` (build) | Standard Next.js mode. In `production`, auth cookies are marked `secure` (**HTTPS required**). You normally do not set this by hand. |

Notes:
- **`NEXT_PUBLIC_PRAXIS_TRANSPORT` is build-time.** Next inlines `NEXT_PUBLIC_*`
  into the client bundle, so change it **before** `build`, and **restart** `dev`
  after editing it — a hot reload will not pick it up.
- `PRAXIS_BASE_URL` and `IAM_BASE_URL` are read on the server per request, so they
  only need to be present in the server environment (no rebuild required).
- Defaults target a local setup where iam runs on `8090` and praxis on `8091`.

## Configuration scenarios

### 1. Default / demo — no backends (fake transport)

Nothing to configure. `pnpm --filter @ash/web dev` runs the full Workbench UI driven
by the fake praxis client. Auth routes still call iam if exercised, but the task
flow needs no praxis.

### 2. Live — real praxis + iam

`apps/web/.env.local`:

```dotenv
# Use the real praxis transport (default is the fake client)
NEXT_PUBLIC_PRAXIS_TRANSPORT=http

# Backends the server-side routes forward to
PRAXIS_BASE_URL=http://localhost:8091
IAM_BASE_URL=http://localhost:8090
```

Then:
1. Start **iam** (default `:8090`) and **praxis** (default `:8091`) — e.g. praxis ships
   a `docker-compose.yml` that brings up its dependencies.
2. `pnpm --filter @ash/web dev` (restart if it was already running, because
   `NEXT_PUBLIC_PRAXIS_TRANSPORT` changed).
3. **Log in** through the app. The BFF rejects praxis calls with `401` when there is
   no session — a valid iam JWT (held in the httpOnly cookie) is required for every
   praxis request.

### 3. Production

Set `PRAXIS_BASE_URL` / `IAM_BASE_URL` to the deployed service URLs and
`NEXT_PUBLIC_PRAXIS_TRANSPORT=http` at **build time**. Serve over **HTTPS**: in
`production`, auth cookies are `secure`, so they will not be set over plain HTTP.

## Auth cookies (reference)

Set server-side by `apps/web/src/server/auth.ts` after login/refresh. All are
`httpOnly`, `sameSite=lax`, `path=/`, and `secure` when `NODE_ENV=production`:

| Cookie | Lifetime | Contents |
|---|---|---|
| `ash_access_token` | 15 minutes | iam access JWT (forwarded to praxis as `Bearer`) |
| `ash_refresh_token` | 7 days | iam refresh token (used to mint a new access token) |
| `ash_user` | 7 days | Serialized current-user profile |

The access token auto-refreshes (via the refresh cookie) when it expires; a failed
refresh clears all three.

## Security notes

- The BFF (`/api/praxis/[...segments]`) only proxies paths under `/v1/tasks/**`
  (allowlist) — it is not an open proxy.
- Secrets (`PRAXIS_BASE_URL`, `IAM_BASE_URL`) are server-only and never shipped to
  the browser; only `NEXT_PUBLIC_*` values reach the client bundle.
- Production requires HTTPS for auth cookies to be accepted (`secure`).

## Related

- `docs/adr/0012-praxis-live-transport.md` — BFF SSE proxy + transport flag.
- `docs/adr/0015-praxis-0.1.5-interactive-execution.md` — interactive execution.
- `docs/superpowers/specs/2026-05-30-auth-iam-integration.md` — iam integration.
- `apps/web/src/server/praxis.ts`, `apps/web/src/server/auth.ts`,
  `apps/web/src/lib/praxis/client.ts`, `packages/iam-client/src/client.ts` — sources of truth.
