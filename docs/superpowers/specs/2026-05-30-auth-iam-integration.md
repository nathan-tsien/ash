# Auth — IAM Integration Design

**Date:** 2026-05-30
**Status:** Accepted
**Phase:** 1.5 — Auth integration (user-requested, pre-Phase 2)

Companion governance:

- Maintain alongside **`AGENTS.md`**, **`ROADMAP.md`**, **`docs/components/`**, **`docs/adr/`**
- Conflict resolution favors explicit ADRs + supersession rather than silently editing accepted history.

## Goal

Integrate with the standalone IAM service (`localhost:8090`) to implement user registration
(with email OTP verification), login, logout, and password recovery (forgot + reset) for the
ash web application.

## Scope

| Included | Deferred |
|----------|----------|
| IAM client package (`packages/iam-client`) generated from OpenAPI spec | Admin user management |
| Registration with email OTP verification (dev code: `123456`) | Session management UI |
| Login with email + password | Login history UI |
| Forgot password → OTP → reset password | Account deletion |
| Logout (revoke refresh token) | Profile update (display name, avatar) |
| httpOnly cookie token storage | Password change for authenticated users |
| Next.js middleware auth guard + token refresh | |
| Auth pages: login, register, forgot-password, reset-password, verify-email | |
| Auth Context for client-side user state | |
| i18n strings (zh-CN baseline, en) | |

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────┐
│  Pages (auth route group)                   │
│  /login, /register, /forgot-password,       │
│  /reset-password, /verify-email             │
├─────────────────────────────────────────────┤
│  Auth Context (client state)                │
│  React Context: user, login, logout,        │
│  register, loading                          │
├─────────────────────────────────────────────┤
│  API Routes (BFF — cookie management)       │
│  /api/auth/login, /api/auth/register,       │
│  /api/auth/logout, /api/auth/refresh,       │
│  /api/auth/verify-email,                    │
│  /api/auth/forgot-password,                 │
│  /api/auth/reset-password                   │
├─────────────────────────────────────────────┤
│  IAM Client (packages/iam-client)           │
│  Generated types + openapi-fetch wrapper    │
│  Base: http://localhost:8090/v1/apps/ash    │
└─────────────────────────────────────────────┘
```

### API Routes as BFF

httpOnly cookies cannot be set from client-side JavaScript. API routes act as a thin proxy:
receive credentials from the client, call IAM, set httpOnly cookies in the response.
This keeps tokens completely invisible to JavaScript.

## User Flows

### 1. Registration

```
/register → fill email + display_name + password
  → POST /api/auth/register → IAM POST /auth/register
  → redirect /verify-email?email=xxx
  → input OTP code (dev: 123456)
  → POST /api/auth/verify-email → IAM POST /auth/otp/verify
  → redirect /login (success toast)
```

### 2. Login

```
/login → fill email + password
  → POST /api/auth/login → IAM POST /auth/login
  → API route sets httpOnly cookies (access_token, refresh_token)
  → redirect /app (workbench)
```

### 3. Forgot / Reset Password

```
/forgot-password → input email
  → POST /api/auth/forgot-password → IAM POST /auth/password/forgot
  → redirect /reset-password?email=xxx
  → input OTP code + new password
  → POST /api/auth/reset-password → IAM POST /auth/password/reset
  → redirect /login (success toast)
```

### 4. Logout

```
Sidebar / Settings → click logout
  → POST /api/auth/logout → IAM POST /auth/logout (revoke refresh_token)
  → clear cookies → redirect /login
```

### 5. Token Refresh (automatic)

```
Middleware checks access_token cookie
  → if expired, use refresh_token to call IAM POST /auth/refresh
  → update cookies → proceed
  → if refresh also fails → redirect /login
```

## IAM API Endpoints Used

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/apps/ash/auth/register` | POST | No | Create user |
| `/v1/apps/ash/auth/login` | POST | No | Get tokens |
| `/v1/apps/ash/auth/otp/verify` | POST | No | Verify email OTP |
| `/v1/apps/ash/auth/refresh` | POST | No | Refresh access token |
| `/v1/apps/ash/auth/logout` | POST | No | Revoke refresh token |
| `/v1/apps/ash/auth/password/forgot` | POST | No | Send reset OTP |
| `/v1/apps/ash/auth/password/reset` | POST | No | Reset password with OTP |
| `/v1/apps/ash/auth/check-availability` | POST | No | Check email/name availability |
| `/v1/apps/ash/me` | GET | JWT | Get current user profile |

## Cookie Strategy

| Cookie | httpOnly | Secure | SameSite | Path | Max-Age |
|--------|----------|--------|----------|------|---------|
| `ash_access_token` | Yes | Yes (prod) | Lax | `/` | 15 min |
| `ash_refresh_token` | Yes | Yes (prod) | Lax | `/` | 7 days |
| `ash_user` | No | Yes (prod) | Lax | `/` | 7 days |

`ash_user` stores non-sensitive user info (id, email, display_name, role) as JSON for client-side
Auth Context initialization without a server round-trip.

## Middleware Logic

```
1. Skip: /api/*, /_next/*, static files, /login, /register, /forgot-password,
   /reset-password, /verify-email, marketing pages
2. Check ash_access_token cookie exists
   → No: redirect to /login
3. Check ash_user cookie exists
   → No: redirect to /login
4. (Future: verify JWT signature, check expiry, auto-refresh)
```

## File Structure

```
packages/iam-client/
  package.json
  tsconfig.json
  src/
    index.ts              # Re-exports
    types.ts              # Generated by openapi-typescript
    client.ts             # openapi-fetch instance

apps/web/src/
  lib/
    iam-client.ts         # Singleton IAM client instance
  server/
    auth.ts               # Cookie read/write/clear utilities
  context/
    auth-context.tsx       # React Context for auth state
  app/
    api/auth/
      login/route.ts
      register/route.ts
      logout/route.ts
      refresh/route.ts
      verify-email/route.ts
      forgot-password/route.ts
      reset-password/route.ts
    [locale]/
      (auth)/
        layout.tsx         # Centered card layout
        login/page.tsx
        register/page.tsx
        forgot-password/page.tsx
        reset-password/page.tsx
        verify-email/page.tsx
  proxy.ts                 # Updated: auth redirect in middleware
  components/
    auth/
      login-form.tsx
      register-form.tsx
      forgot-password-form.tsx
      reset-password-form.tsx
      verify-email-form.tsx

messages/
  zh.json                  # Auth.* namespace added
  en.json                  # Auth.* namespace added
```

## Design Decisions

### 1. openapi-typescript + openapi-fetch for API client generation

- Generates TypeScript types from OpenAPI spec at build time
- openapi-fetch provides type-safe fetch wrapper with no runtime bloat
- Single source of truth: IAM OpenAPI spec at `/Users/nathantsien/x/projects/iam/api/openapi.yaml`
- Script in `packages/iam-client/package.json`: `"generate": "openapi-typescript ... -o src/types.ts"`

### 2. httpOnly cookies for token storage

- Access token and refresh token stored as httpOnly cookies (not accessible via JS)
- Prevents XSS token theft
- Non-sensitive user info in a readable cookie for client-side state initialization

### 3. API Routes as BFF pattern

- All IAM calls go through Next.js API routes
- API routes handle cookie setting/clearing
- Client code calls `/api/auth/*` endpoints (same origin, no CORS)

### 4. Independent (auth) route group

- Auth pages are not part of (marketing) or (app) groups
- Own layout with centered card design
- Not wrapped by SettingsModalProvider or CommandPaletteProvider

### 5. Auth Context for client state

- React Context provides user, login(), logout(), register() to components
- Initializes from `ash_user` cookie (no server round-trip needed)
- Updates cookie and context on auth state changes

## Visual Design

Auth pages follow the existing visual language (ADR-0005):

- Centered card on canvas background (`bg-background`)
- Card uses elevated surface (`bg-card`, `border-border`)
- Primary button for submit actions
- Muted text for secondary links ("Forgot password?", "Already have an account?")
- Form inputs use existing `@ash/ui` Input component
- Responsive: single column, max-width ~400px

## Testing Strategy

Phase 1.5 follows Phase 1 testing posture (tests only when explicitly requested).
No automated tests required unless user requests them.

Manual verification:
1. Register → verify email → login → see workbench
2. Forgot password → receive OTP (dev: 123456) → reset → login with new password
3. Logout → redirected to login → protected routes inaccessible
4. Token refresh works transparently on subsequent requests

## Open Questions

None — all decisions confirmed with user during brainstorming.
