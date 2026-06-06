# Praxis Live Transport — 真实 HTTP 客户端 + BFF SSE 代理路由

**Date:** 2026-06-06
**Status:** Draft
**Builds on:** `2026-06-03-task-live-execution.md` (fake-driven slice, praxis client interface + reducer), ADR-0006 (data adapter seam), ADR-0007 (transport = SSE), ADR-0011 (praxis contract adoption)
**External contract:** praxis OpenAPI `v0.1.0` (`src/lib/praxis/contract/praxis.yaml` + `schemas.json`), praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)

## Problem

The fake-driven slice (ADR-0011) shipped the full execution pipeline — `PraxisTaskClient` interface,
`runtimeEventReducer`, `TaskRunProvider`, and the running-state UI — driven by a local
`fakePraxisClient`. The real transport (`httpPraxisClient` + a BFF SSE proxy route) was deliberately
deferred to "the next slice." This is that slice: wire the client to a real praxis over HTTP, so swapping
the env flag from `fake` to `http` runs the workbench against a deployed praxis with **no change to the
reducer, provider, or UI**.

This advances the ADR-0007 phase gate: the SSE route handler that was "gated Phase 2 piece" lands here.

## Scope

In scope:
- `httpPraxisClient` — a real `PraxisTaskClient` implementation (fetch-based) running in the browser,
  talking only to same-origin `/api/praxis/...` BFF routes.
- A **catch-all BFF proxy** route that reads the iam JWT from the httpOnly cookie server-side, forwards it
  as `Authorization: Bearer`, and proxies both control-plane POSTs and the SSE event stream to praxis.
- An SSE frame parser (byte stream → `RuntimeEvent` sequence), unit-tested.
- Env-flag client selection (`fake` default, `http` opt-in).
- `AbortSignal` plumbing through `streamEvents` so an abandoned stream does not leak a connection.
- Regression tests for the new transport surfaces (Phase 2 testing posture).

Out of scope (deferred, explicitly):
- **Live end-to-end verification** against a deployed praxis — none is available yet. This slice is
  **build-to-contract**: verified by unit tests + a mocked upstream. The `fake` client stays the default.
- **SSE reconnection / `Last-Event-ID` resume.** A dropped stream surfaces as a failed task; no replay
  buffer. Documented as a follow-up.
- Server-side persistence of runs (unchanged from ADR-0011: runs are session-only).
- Project live execution; single-Task multi-turn (`/messages` is implemented in the client + proxy for
  contract completeness, but the UI does not drive it this slice).
- `crates/ash-server` — the BFF is a Next.js route handler, not a Rust server. cogito stays out of the
  browser-facing graph (the proxy speaks HTTP to praxis; it does not import cogito).

## Why everything is proxied (the core constraint)

The iam access token lives in an **httpOnly cookie** (`ash_access_token`, see `src/server/auth.ts`).
Browser JavaScript cannot read it, so the browser cannot attach `Authorization: Bearer` to *any* praxis
request — not just the `EventSource`/SSE case ADR-0007 called out, but the control-plane POSTs too.

Therefore **all** praxis traffic from the browser goes through a same-origin BFF route. The browser fetch
carries the cookie automatically; the server route reads it, exchanges it for a Bearer header, and forwards
to praxis. This keeps the JWT server-side and out of browser-readable storage.

## Architecture

```
TaskRunProvider (browser, client component)
  → httpPraxisClient.{createTask,startTask,streamEvents,sendMessage,complete,cancel}
      → fetch("/api/praxis/tasks/...", { same-origin; cookie auto-attached })
          → [BFF]  src/app/api/praxis/[...segments]/route.ts   (GET + POST)
              → forwardToPraxis():
                  - allowlist: segments[0] === "tasks" (else 404)
                  - read access token (refresh-on-401, reuse /me logic)
                  - fetch(`${PRAXIS_BASE_URL}/v1/${segments}`, Authorization: Bearer JWT)
                  - control plane: pass through JSON body + status (201/202/204/4xx)
                  - /events: return new Response(upstream.body, text/event-stream)  // streamed through
      → streamEvents parses SSE frames → yields RuntimeEvent
  → runtimeEventReducer(state, event)  (unchanged)
  → React state → existing Chat / ToolsCard / ArtifactsCard / Sidebar (unchanged)
```

### Component: `httpPraxisClient` (browser)

Implements `PraxisTaskClient`. Every method hits a same-origin `/api/praxis/...` path:

| Method | Request |
|--------|---------|
| `createTask(req)` | `POST /api/praxis/tasks`, body = `CreateTaskRequest` → `TaskSummary` (201) |
| `startTask(id, userInput)` | `POST /api/praxis/tasks/{id}/start`, body `{ user_input }` → `TaskSummary` (202) |
| `streamEvents(id, signal?)` | `GET /api/praxis/tasks/{id}/events`, read `response.body` reader, parse SSE, `yield` RuntimeEvent until stream end / abort |
| `sendMessage(id, text)` | `POST /api/praxis/tasks/{id}/messages`, body `{ text }` (202) |
| `complete(id)` | `POST /api/praxis/tasks/{id}/complete` (204) |
| `cancel(id)` | `POST /api/praxis/tasks/{id}/cancel` (204) |

`streamEvents` uses `fetch` + a `ReadableStream` reader (not `EventSource`): it accepts an `AbortSignal`,
needs no auto-reconnect for a one-shot turn, and yields cleanly as an `AsyncIterable`. A non-2xx response
before streaming throws; a mid-stream break propagates as a thrown error from the `for await`.

### Component: SSE parser (`src/lib/praxis/sse.ts`)

A pure, incremental parser: feed it decoded string chunks, it emits complete event payloads. Handles:
- frames separated by a blank line (`\n\n`), buffered across chunk boundaries,
- multiple `data:` lines concatenated with `\n` per the SSE spec,
- comment/heartbeat lines (`:` prefix) and non-`data` fields (`event:`, `id:`) — ignored this slice,
- trailing partial frame retained in the buffer until completed.

Each completed frame's `data` is `JSON.parse`d into a `RuntimeEvent`. A malformed JSON payload throws
(surfaces as a failed turn). This is non-trivial client logic isolated from the network → **unit tested**.

### Component: BFF proxy (`src/app/api/praxis/[...segments]/route.ts` + `src/server/praxis.ts`)

A single catch-all route handler exporting `GET` and `POST`. The route file stays thin; the logic lives in
`src/server/praxis.ts`:

- `PRAXIS_BASE_URL` — `process.env.PRAXIS_BASE_URL ?? "http://localhost:8091"` (server-only; distinct from
  iam's `8090`). Mirrors the `@ash/iam-client` base-url pattern.
- `forwardToPraxis(request, segments, method)`:
  1. **Allowlist** — reject unless `segments[0] === "tasks"` (return 404). Prevents an open proxy to
     arbitrary praxis paths.
  2. **Auth** — `getAccessTokenWithRefresh()` (new helper in `server/auth.ts`): return the cookie token;
     if absent, run `refreshAccessToken()` and re-read. If still none → `401`.
  3. **Forward** — `fetch(`${PRAXIS_BASE_URL}/v1/${segments.join("/")}`, { method, headers: { Authorization:
     `Bearer ${token}`, ...(POST ? {"content-type":"application/json"} : {}) }, body, signal:
     request.signal })`.
  4. **Respond** —
     - SSE (last segment `events`): `new Response(upstream.body, { status, headers: { "content-type":
       "text/event-stream", "cache-control": "no-cache, no-transform", "connection": "keep-alive" } })` —
       the stream is piped through, not buffered.
     - Otherwise: pass through status + JSON body (handle empty 204).
  - `export const dynamic = "force-dynamic"` and the Node.js runtime (cookies + streaming).

The proxy **does not** import cogito or any praxis Rust crate — it speaks HTTP only. The
`apps/web`-must-not-import-cogito rule is respected.

### Client selection (`src/lib/praxis/client.ts`)

```ts
export function getPraxisClient(): PraxisTaskClient {
  return process.env.NEXT_PUBLIC_PRAXIS_TRANSPORT === "http" ? httpPraxisClient : fakePraxisClient;
}
```

`NEXT_PUBLIC_` so the flag is readable in the browser (where `TaskRunProvider` constructs the client).
Default (unset) = `fake`, keeping the build-to-contract posture: nothing changes for existing dev/CI until
someone opts in with a real praxis.

### Interface change: `AbortSignal`

`PraxisTaskClient.streamEvents` gains an optional second parameter:

```ts
streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent>;
```

`fakePraxisClient` accepts and ignores it. `httpPraxisClient` passes it to `fetch` and stops yielding on
abort. `TaskRunProvider` creates an `AbortController` per run, passes its signal, and aborts after the run
settles (or on error) so an abandoned real SSE connection is torn down rather than leaked.

## Error handling

- Control-plane HTTP error (non-2xx from the proxy) → `httpPraxisClient` throws → `TaskRunProvider`'s
  existing `catch` marks the task `failed`.
- SSE upstream non-200 → throw before the first yield → `failed`.
- Mid-stream break / malformed frame → thrown from `for await` → `failed`.
- `turn_failed` runtime event → already mapped to `failed` by `runtimeEventReducer` (unchanged).
- Auth: missing/expired token → proxy attempts refresh; on failure returns `401`, surfaced as `failed`.
- No reconnection/resume this slice (documented deferral).

## Testing posture (Phase 2: transport adapters ship with regression tests)

1. **SSE parser** (`__tests__/sse.test.ts`) — chunked byte sequences including split frames, multi-line
   `data:`, heartbeat/comment lines, multiple frames per chunk → expected `RuntimeEvent[]`.
2. **`httpPraxisClient`** (`__tests__/http-client.test.ts`) — mock `fetch`; assert each method targets the
   right `/api/praxis/...` path, method, and body; assert `streamEvents` yields parsed events from a mocked
   streamed body and stops on abort.
3. **BFF proxy** (`__tests__/praxis-proxy.test.ts` or route-level) — mock `getAccessTokenWithRefresh` +
   upstream `fetch`; assert allowlist rejection (non-`tasks` → 404), `Authorization: Bearer` forwarding,
   SSE `content-type` passthrough, 204/empty-body handling, and `401` when unauthenticated.

The `fake` client's PPT script remains a fixture, not a contract.

## File plan (apps/web)

| Path | Role |
|------|------|
| `src/app/api/praxis/[...segments]/route.ts` | **New.** Catch-all BFF; thin; exports `GET`/`POST`. |
| `src/server/praxis.ts` | **New.** `forwardToPraxis()` + `PRAXIS_BASE_URL`. |
| `src/server/auth.ts` | **Edit.** Add `getAccessTokenWithRefresh()`. |
| `src/lib/praxis/http-client.ts` | **Implement.** Replace the throwing scaffold. |
| `src/lib/praxis/sse.ts` | **New.** Incremental SSE frame parser. |
| `src/lib/praxis/client.ts` | **Edit.** Env-flag selection; add `signal?` to `streamEvents`. |
| `src/lib/praxis/fake-client.ts` | **Edit.** Accept + ignore `signal`. |
| `src/components/workbench/task-run-provider.tsx` | **Edit.** `AbortController` per run; pass + abort signal. |
| `src/lib/praxis/__tests__/sse.test.ts` | **New.** Parser unit tests. |
| `src/lib/praxis/__tests__/http-client.test.ts` | **New.** Client unit tests. |
| `src/app/api/praxis/__tests__/praxis-proxy.test.ts` | **New.** Proxy route tests. |

## Documentation impact

- This spec.
- **New ADR-0012** — real praxis transport + BFF proxy: catch-all-with-allowlist decision, everything-proxied
  rationale (httpOnly cookie), build-to-contract posture, deferred reconnection. Advances the ADR-0007 gate.
- Update **ADR-0007** and **ADR-0011** status notes: the deferred "real SSE transport + BFF proxy" is now
  landed (reference ADR-0012).
- Update `docs/components/workbench-chat.md` / `workbench-workspace.md` only if running-state behavior
  changes (it should not — same reducer/UI).

## Risks / notes

- **No live verification.** Correctness rests on the OpenAPI contract + unit tests until a praxis is
  deployed. The default stays `fake`, so this cannot regress dev/CI.
- **Open-proxy surface.** Mitigated by the `tasks/` allowlist; revisit if more praxis namespaces are
  proxied (e.g. `projects/`).
- **Streaming runtime.** The route must run on Node.js (not edge) for cookie access + body streaming;
  `dynamic = "force-dynamic"` prevents caching the SSE response.
- **Contract drift.** If praxis revises the wire shape, regenerate `generated.ts` and adjust
  `runtime-events.ts` + the reducer only — the transport plumbing is shape-agnostic.
