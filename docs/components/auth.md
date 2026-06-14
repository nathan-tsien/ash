# Authentication — login flow and session persistence

Purpose: document the implemented auth subsystem: IAM delegation, cookie-based session, automatic token refresh, and client/server state coordination.

## Context

ash does not implement authentication itself. It delegates to a standalone IAM service (`IAM_BASE_URL`, default `http://localhost:8090`). The web app acts as a BFF (Backend-for-Frontend): API routes call IAM, then translate the response into httpOnly cookies that the browser manages automatically.

Session persistence follows standard SaaS practice: a short-lived access token (15 min) plus a long-lived refresh token (7 days). When the access token expires, the system attempts silent refresh so the user is not forced to log in again.

## Architecture

```
Browser
  |
  |--(1) POST /api/auth/login {email, password}
  |      |
  |      v
  |   apps/web API route
  |      |
  |      |--(2) POST /auth/login --> IAM
  |      |<--(3) {access_token, refresh_token, user_id, email, role}
  |      |
  |      |--(4) Set httpOnly cookies
  |      |
  |<--(5) {user}
  |
  |--(6) App load: GET /api/auth/me
  |      |
  |      |-- reads ash_user cookie (or auto-refreshes if missing)
  |<--(7) {user} or 401
```

## Cookie contract

All three cookies are **httpOnly** (not readable by JavaScript).

| Cookie | Content | Max-Age | Secure |
|--------|---------|---------|--------|
| `ash_access_token` | JWT access token | 15 min | prod only |
| `ash_refresh_token` | JWT refresh token | 7 days | prod only |
| `ash_user` | JSON-serialized `AuthUser` | 7 days | prod only |

Shared attributes: `sameSite: "lax"`, `path: "/"`.

Cookie utilities live in `apps/web/src/server/auth.ts`:
- `setAuthCookies({ accessToken, refreshToken, user })`
- `clearAuthCookies()`
- `getAccessToken()` / `getRefreshToken()` / `getAuthUser()`
- `refreshAccessToken()` — single-flight call to IAM `/auth/refresh`; rewrites cookies on success, clears them only on a definitive 401, and preserves them on transient failures. See "Token refresh mechanism".

## API routes

| Route | File | Behavior |
|-------|------|----------|
| `POST /api/auth/login` | `app/api/auth/login/route.ts` | Validates credentials via IAM; sets cookies; returns user. |
| `POST /api/auth/logout` | `app/api/auth/logout/route.ts` | Revokes refresh token on IAM; clears all cookies. |
| `GET /api/auth/me` | `app/api/auth/me/route.ts` | Returns user from cookie. If cookie missing but refresh token exists, **auto-refreshes** silently before responding. |
| `POST /api/auth/refresh` | `app/api/auth/refresh/route.ts` | Explicit refresh endpoint. Calls `refreshAccessToken()`; returns user or 401. |
| `POST /api/auth/register` | `app/api/auth/register/route.ts` | Creates account via IAM. |
| `POST /api/auth/verify-email` | `app/api/auth/verify-email/route.ts` | Verifies OTP via IAM. |
| `POST /api/auth/forgot-password` | `app/api/auth/forgot-password/route.ts` | Requests password reset OTP via IAM. |
| `POST /api/auth/reset-password` | `app/api/auth/reset-password/route.ts` | Resets password via IAM. |

## Login flow

```
/login page
  |
  v
LoginForm --(fetch)--> POST /api/auth/login
                          |
                          |-- IAM POST /auth/login
                          |-- setAuthCookies()
                          |
                          +-- returns {user}
                          |
AuthContext.setUser(user)
  |
  v
router.push("/app")
```

## Session recovery on app load

`AuthProvider` (mounted in `app/[locale]/layout.tsx`) initializes client state:

```
useEffect on mount
  |
  v
fetch("/api/auth/me")
  |
  +-- ok --> setUser(data.user)
  |
  +-- 401
        |
        +-- fetch("/api/auth/refresh", {method: "POST"})
              |
              +-- ok --> fetch("/api/auth/me") again --> setUser(user)
              |
              +-- 401 --> setUser(null)
```

The server-side `/api/auth/me` route also attempts refresh internally, so the client retry is a safety net for edge cases (e.g., concurrent token rotation).

## Token refresh mechanism

When `refreshAccessToken()` is invoked:

1. Reads `ash_refresh_token` from cookies. If absent, returns `null` without a network call.
2. **Single-flight by token value**: if a refresh for this exact refresh token is already
   in flight in this process, the caller joins it instead of issuing a second
   `POST /auth/refresh`. The IAM **rotates** refresh tokens (each token is redeemable
   once; reusing a spent token is a 401), so coalescing is what prevents a concurrent
   refresh stampede — see the failure mode below.
3. Calls IAM `POST /auth/refresh` with `{ refresh_token }` once for the joined group.
4. On success (200): rewrites all three cookies via `setAuthCookies()` and returns the user.
   Coalesced callers each write the same rotated values to their own response (idempotent).
5. On a **definitive** invalid token (IAM 401): calls `clearAuthCookies()` and returns `null` —
   the session is genuinely over.
6. On a **transient** failure (5xx, account-disabled 403, network/abort): leaves all cookies
   intact and returns `null`. A later request retries. A momentary IAM hiccup must not destroy
   a 7-day session.

### Failure mode this guards against (regression fixed)

Symptom: "login state unstable — keeps logging out." Root cause: the workbench fans out several
praxis BFF calls in parallel; when the 15-minute access token expires, each request found no
access token and independently redeemed the **same** refresh token. With rotation, the first
won and the rest got 401 — and the old code called `clearAuthCookies()` on *any* failure, wiping
the freshly-rotated refresh token and the 7-day `ash_user` cookie. A single expiry boundary under
parallel traffic thus nuked the whole session. The single-flight + transient/definitive split
above removes both the stampede and the destructive-clear-on-transient-error.

This is used by:
- `/api/auth/me` — auto-refresh before returning 401.
- `/api/auth/refresh` — explicit client-triggered refresh.
- every praxis BFF call via `getAccessTokenWithRefresh()` (`server/praxis.ts`, `server/praxis-client.ts`).

> Note: the single-flight map is per Node process. In a single-instance deployment (current ash
> posture) it eliminates the race. Under horizontal scaling, instances can still race across the
> rotation boundary; the transient/definitive split keeps that race from ending the session, but a
> shared lock or refresh-token grace window would be the durable fix — track if/when ash scales out.

## Middleware (proxy) status

`apps/web/src/proxy.ts` is the app's auth guard and **is active**. Next.js 16 renamed the
middleware convention from `middleware.ts` to `proxy.ts` (exported `proxy` function), so this
file runs as edge middleware on every non-API/static request per its `config.matcher`.

The guard gates protected routes on the **refresh token** (`ash_refresh_token`, 7-day), not the
15-minute `ash_access_token`. Gating on the access token bounced still-valid users to `/login`
the moment it lapsed even though `/me` + silent refresh succeeded; the access token is refreshed
transparently by the BFF proxy (`getAccessTokenWithRefresh`). The refresh token is set/cleared
atomically with `ash_user`, so its presence is the renewability signal. Covered by
`apps/web/src/__tests__/proxy.test.ts`.

## Token resolution contexts (refresh vs. read-only)

Refresh rotates the refresh token and **writes cookies**, which Next.js permits only in a Server
Action or Route Handler — never during a Server Component render. So the two server token getters
are not interchangeable:

| Getter | Refreshes + writes cookies? | Use from |
|--------|------|----------|
| `getAccessTokenWithRefresh()` | Yes | Route handlers only — BFF `forwardToPraxis` (`/api/praxis`), `/api/auth/me`, `/api/auth/refresh` |
| `getAccessToken()` | No (read-only) | Server Component render — `serverPraxisClient` loaders (`listTasks` / `getActiveTask`) |

`serverPraxisClient` (`apps/web/src/server/praxis-client.ts`) deliberately uses the **read-only**
getter. Calling the refreshing one during render throws *"Cookies can only be modified in a Server
Action or Route Handler."* When the SSR access token has expired the loader 401s and falls back to
empty data; the token is refreshed by the writable paths above and by the client `AuthProvider` on
mount, so the next BFF call / navigation renders fresh. (Gating the proxy on the refresh token —
see above — is what now lets a render reach RSC with an expired access token, which is why this
boundary matters.) Covered by `apps/web/src/server/__tests__/praxis-client.test.ts`.

## Client state

`AuthContext` (`apps/web/src/context/auth-context.tsx`) exposes:

| Property | Type | Description |
|----------|------|-------------|
| `user` | `AuthUser \| null` | Current user or null if unauthenticated. |
| `status` | `"loading" \| "authenticated" \| "unauthenticated"` | Resolution state of the initial `/me` probe. `loading` until it lands; `unauthenticated` distinguishes "probe failed" from "not yet probed" (both have `user: null`). |
| `login(email, password)` | `Promise<void>` | Calls `/api/auth/login`; sets `user` + `status: authenticated`. |
| `logout()` | `Promise<void>` | Calls `/api/auth/logout`; clears `user` + `status: unauthenticated`. |
| `refreshUser()` | `void` | Re-fetches `/api/auth/me` (with retry on 401); updates `user` + `status`. |

### Protected-route guard (revoked-session catch)

The proxy admits any request with a refresh-token cookie but cannot detect a
present-but-revoked token. `RequireAuth` (`apps/web/src/components/auth/require-auth.tsx`),
mounted in the `(app)` route-group layout, closes that gap on the client: when the
`/me` probe + silent refresh fail (`status: unauthenticated`) it redirects to
`/login?callbackUrl=<path>`. While `status` is `loading` it renders children (the proxy
already guaranteed a session cookie) to avoid blanking the app on every navigation.
Covered by `apps/web/src/components/auth/__tests__/require-auth.test.tsx` and
`apps/web/src/context/__tests__/auth-context.test.tsx`.

## File map

```
packages/iam-client/
  src/client.ts          # openapi-fetch instance
  src/types.ts           # Generated from IAM OpenAPI spec
  package.json           # "generate" script: openapi-typescript from GitHub raw URL

apps/web/src/
  server/auth.ts         # Cookie utilities + refreshAccessToken()
  context/auth-context.tsx # React Context for client auth state (user + status)
  components/auth/require-auth.tsx # Client guard: redirect to /login on revoked session
  app/api/auth/
    login/route.ts
    logout/route.ts
    me/route.ts
    refresh/route.ts
    register/route.ts
    verify-email/route.ts
    forgot-password/route.ts
    reset-password/route.ts
  proxy.ts               # Active Next.js 16 edge middleware (auth guard)
```

## IAM client generation

`packages/iam-client/src/types.ts` is auto-generated by `openapi-typescript` from the IAM OpenAPI spec. Regenerate when the IAM API changes:

```bash
pnpm --filter iam-client generate
```

The generate script points to:
`https://raw.githubusercontent.com/nathan-tsien/iam/main/api/openapi.yaml`

## See also

- [Settings](./settings.md) — Account section displays user info from `AuthContext`.
- [ADR-0009](../adr/0009-tenancy-model.md) — Tenancy model defers real profile/billing to Phase 2.
- `docs/superpowers/specs/2026-05-30-auth-iam-integration.md` — Original design spec (some details superseded by implementation).
