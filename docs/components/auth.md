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
- `refreshAccessToken()` — calls IAM `/auth/refresh` and rewrites cookies on success; clears cookies on failure.

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

1. Reads `ash_refresh_token` from cookies.
2. Calls IAM `POST /auth/refresh` with `{ refresh_token }`.
3. On success (200):
   - Extracts new `access_token`, `refresh_token`, `user_id`, `email`, `role`.
   - Builds `AuthUser` object.
   - Calls `setAuthCookies()` to rewrite all three cookies.
   - Returns the user.
4. On failure (401/403/error):
   - Calls `clearAuthCookies()` to remove all auth cookies.
   - Returns `null`.

This is used by:
- `/api/auth/me` — auto-refresh before returning 401.
- `/api/auth/refresh` — explicit client-triggered refresh.

## Middleware status

`apps/web/src/proxy.ts` defines an auth guard but is **not currently wired up** as Next.js middleware (no `middleware.ts` file exists). The app relies on page-level and API-level auth checks instead. If middleware is enabled in the future, its check should look at the refresh token (not just the access token) to avoid redirecting users who can still be silently refreshed.

## Client state

`AuthContext` (`apps/web/src/context/auth-context.tsx`) exposes:

| Property | Type | Description |
|----------|------|-------------|
| `user` | `AuthUser \| null` | Current user or null if unauthenticated. |
| `login(email, password)` | `Promise<void>` | Calls `/api/auth/login`; updates `user`. |
| `logout()` | `Promise<void>` | Calls `/api/auth/logout`; clears `user`. |
| `refreshUser()` | `void` | Re-fetches `/api/auth/me` (with retry on 401); updates `user`. |

## File map

```
packages/iam-client/
  src/client.ts          # openapi-fetch instance
  src/types.ts           # Generated from IAM OpenAPI spec
  package.json           # "generate" script: openapi-typescript from GitHub raw URL

apps/web/src/
  server/auth.ts         # Cookie utilities + refreshAccessToken()
  context/auth-context.tsx # React Context for client auth state
  app/api/auth/
    login/route.ts
    logout/route.ts
    me/route.ts
    refresh/route.ts
    register/route.ts
    verify-email/route.ts
    forgot-password/route.ts
    reset-password/route.ts
  proxy.ts               # Middleware candidate (not wired up)
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
