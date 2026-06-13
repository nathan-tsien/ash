# Praxis Task Lifecycle — List, Deep-link Cold Load, Cancel, Multi-turn

**Date:** 2026-06-13
**Status:** Accepted
**Builds on:** `2026-06-13-praxis-interactive-execution-design.md` (ask_user + same-session
history catch-up), `2026-06-06-praxis-live-transport.md` (httpPraxisClient + BFF SSE proxy),
ADR-0011 (praxis contract adoption), ADR-0012 (live transport), ADR-0015 (interactive execution)
**External contract:** praxis OpenAPI `v0.1.5` (`github.com/nathan-tsien/praxis`, tag
`openapi-v0.1.5`: `openapi/praxis.yaml` + `openapi/schemas.json`), praxis ADR-0008 (task FSM)
**Supersedes (partial):** ADR-0011 §5 (multi-turn deferred), ADR-0015 §4/§6 (deep-link cold load
deferred) — recorded in ADR-0016.

## Problem

Three tasks remained deferred after ADR-0015:

1. **No task list.** There was no `GET /v1/tasks` call, no `/app/tasks` route, and no sidebar
   "view all" link — the task inventory was not accessible.
2. **No deep-link cold load.** A hard reload or direct URL navigation to `/app/task/{id}`
   rendered a blank "unknown task" because the task only existed in ephemeral client state. The
   provider had no mechanism to accept a server-side seed.
3. **No cancel.** The provider and UI exposed no way to send `POST /v1/tasks/{id}/cancel`.
4. **No multi-turn follow-up.** `POST /v1/tasks/{id}/messages` was not wired; the composer was
   disabled on non-fresh tasks.

Additionally, the HTTP control-plane calls in `httpPraxisClient` were hand-written wrappers — path
strings and parameter shapes were not bound to the generated `paths` type. A dedicated
`openapi-fetch` factory that binds all non-SSE calls to `paths` was missing.

## Scope

In scope (all four delivered this slice):

1. **Task list** — `GET /v1/tasks` (paginated cursor), `/app/tasks` route, sidebar "view all" link.
2. **Deep-link cold load** — `GET /v1/tasks/{id}` on the server, provider `seedTask`, and
   `useReattachOnView` history catch-up + live re-subscribe.
3. **Cancel** — `POST /v1/tasks/{id}/cancel`, provider `cancelTask`, chat header button.
4. **Multi-turn** — `POST /v1/tasks/{id}/messages`, provider `sendFollowUp`, composer
   `onFollowUp` enabled on terminal tasks.

Also in scope:

- `openapi-fetch` client factory (`openapi-fetch-client.ts`) binding all non-SSE calls to
  `Client<paths>` — both browser (BFF) and server (direct) transports.
- BFF transparent forwarder: `ALLOWED` rekeyed to `segments[0]==="v1" && segments[1]==="tasks"`;
  contract paths line up 1:1.
- `praxisToAshStatus` pure mapping (centralized; used by both list/get projection and the
  `stream_end` reducer).
- `summaryToTask` pure projection (list/get `TaskSummary` → card-shaped `Task` view-model).
- Server-side direct client (`server/praxis-client.ts`) — `createPraxisFetchClient` + JWT via
  `getAccessTokenWithRefresh`, guarded by `import "server-only"`.
- Fake client extensions: seeded list (4 tasks across 2 pages), `listTasks`/`getTask`,
  `sendMessage` stub for multi-turn replay.

Out of scope (deferred, explicitly):

- **Projects** (list/create/live execution) — still deferred per ROADMAP; the BFF allowlist and
  contract do not include `v1/projects` this slice.
- SSE reconnection/resume (`Last-Event-ID`, replay buffer).
- Retry/backoff for 429/503 + `Retry-After`.
- Real artifact rendering (the provisional `.pptx` synthesis from ADR-0011 stays as-is).
- Live end-to-end verification against a deployed praxis instance.

## Transport boundary and CORS

CORS is browser-enforced only. The browser never calls praxis directly — it calls the same-origin
BFF at `/api/praxis/v1/tasks/**`. Server Components (`server/tasks.ts`) call praxis directly
server-to-server via `server/praxis-client.ts`; server-to-server calls are not subject to CORS.
Therefore no praxis CORS configuration is required in development or production.

`server/praxis-client.ts` carries `import "server-only"` so the direct client can never be
bundled into the browser bundle; Next.js throws a build error if a client module imports it.

Both the browser path (through the BFF) and the server path (direct) are built from the same
`createPraxisFetchClient` factory, so every call is contract-bound on both sides.

## Delivered capabilities

### 1. Task list

- `GET /v1/tasks?limit=N&cursor=C` is implemented in both clients (`httpPraxisClient.listTasks`,
  `fakePraxisClient.listTasks`).
- `AllTasksList` is a client component with cursor-based "load more" pagination, empty state, and
  error state.
- `/app/tasks` is a Next.js App Router page rendering `AllTasksList` with the active client
  (`getPraxisClient()`).
- The sidebar's `task-section.tsx` links to `/app/tasks` (i18n key `viewAllTasks`).
- The server (`server/tasks.ts`) uses `serverPraxisClient()` to fetch up to 50 tasks for the
  sidebar server render.

### 2. Deep-link cold load

Cold load flow (hard reload or direct URL navigation to `/app/task/{id}`):

1. The Next.js server component for the task route calls `getActiveTask(taskId, locale)`, which
   calls `GET /v1/tasks/{id}` via `serverPraxisClient()` and projects the result to a card `Task`
   via `summaryToTask`.
2. The server-fetched `Task` is passed to `TaskSeeder`, a thin client component that calls
   `useSeedTask()` in a `useEffect`. `seedTask` upserts the task into provider state without
   clobbering an already-live run.
3. `useReattachOnView(taskId)` (already present from ADR-0015 for in-session navigate-back)
   detects that the seeded task is non-terminal and has no active stream, then triggers history
   catch-up (`GET /v1/tasks/{id}/history` page-by-page) and re-subscribes to the live event
   stream.

Race fix — `runsRef` mirrored via `useLayoutEffect` + presence-gated reattach: the `reattach`
guard checks `runsRef.current[taskId]` (not the stale closure-captured `runs` state) to avoid a
race where `attach` fires before the `seedTask` state update is committed. The reattach is a
no-op if the task is absent, terminal, or already streaming.

### 3. Cancel

- `httpPraxisClient.cancel(id)` calls `POST /v1/tasks/{id}/cancel` via the openapi-fetch factory.
- `fakePraxisClient.cancel(id)` marks the fake run terminal.
- The provider adds `cancelTask(taskId: string): Promise<void>`, exported as `useCancelTask()`.
  On call: invokes the client `cancel`, then optimistically flips the local status to `"failed"`.
  If a stream is open, the abort controller for that task tears it down.
- `workbench-chat.tsx` renders a cancel button in the chat header when
  `active.status === "running" || active.status === "awaiting_input"` (i18n key `cancelTask`).

### 4. Multi-turn follow-up

- `httpPraxisClient.sendMessage(id, text)` calls `POST /v1/tasks/{id}/messages` via the
  openapi-fetch factory. This is the free follow-up path; the `POST /v1/tasks/{id}/answers`
  path for `ask_user` replies is separate (ADR-0015).
- The provider adds `sendFollowUp(taskId: string, text: string): Promise<void>`, exported as
  `useSendFollowUp()`. On call: optimistically appends the user message and flips status to
  `"running"`, then calls `sendMessage`, then calls the internal `runStream` helper to
  re-subscribe for the assistant turn.
- `workbench-chat.tsx` routes the composer submit to `sendFollowUp(active.id, text)` when
  `active.status === "completed"` or `"failed"`, keeping the existing `onAnswer` path for
  `awaiting_input`.

## praxis → ash status mapping

| praxis status    | ash `TaskStatus` | Notes                                               |
|------------------|------------------|-----------------------------------------------------|
| `draft`          | `pending`        | task created, not yet started                       |
| `running`        | `running`        | turn in flight                                      |
| `paused`         | `running`        | ash has no `paused` state; treated as still active  |
| `awaiting_input` | `awaiting_input` | turn paused on `ask_user`; non-terminal             |
| `completed`      | `completed`      | task fully done                                     |
| `failed`         | `failed`         | terminal non-success                                |
| `cancelled`      | `failed`         | ash has no `cancelled` state; maps to terminal fail |

Centralized in `apps/web/src/lib/praxis/status-map.ts` (`praxisToAshStatus`). Used by
`summaryToTask` (list/get projection) and the `stream_end` reducer (live stream termination) so
both agree on the canonical mapping.

## Fake-first validation

Default transport remains `fakePraxisClient` (no env change in dev or CI). HTTP transport is
activated via `NEXT_PUBLIC_PRAXIS_TRANSPORT=http`.

The fake client's seeded list contains 4 tasks:

| id       | title (zh-CN)          | praxis status    |
|----------|------------------------|------------------|
| `seed-1` | 生成季度汇报 PPT        | `completed`      |
| `seed-2` | 整理用户访谈纪要        | `running`        |
| `seed-3` | 竞品分析草稿            | `awaiting_input` |
| `seed-4` | 周报模板               | `draft`          |

`listTasks` pages this seed at `limit=2` (default), returning `next_cursor` on the first call and
`null` on the second, so the "load more" flow exercises both cursor states without a backend.

`getTask(id)` returns the summary for any seed id or any runtime-created task (from the `runs`
map). `sendMessage(id)` marks the fake run back to `running` so the provider re-subscribe path
can emit a scripted turn.

All four capabilities (list, deep-link, cancel, multi-turn) are validated against the fake client
before considering the http transport smoke test.

## Key files

| File | Role |
|------|------|
| `apps/web/scripts/sync-praxis-contract.sh` | Authenticated `gh`-based contract sync + check |
| `apps/web/src/lib/praxis/openapi-fetch-client.ts` | `createPraxisFetchClient` factory (`Client<paths>`) |
| `apps/web/src/lib/praxis/status-map.ts` | `praxisToAshStatus` pure mapping |
| `apps/web/src/lib/praxis/summary-projection.ts` | `summaryToTask` pure projection |
| `apps/web/src/lib/praxis/http-client.ts` | Real transport (openapi-fetch + hand-written SSE) |
| `apps/web/src/lib/praxis/fake-client.ts` | Fake transport (seeded list, scripted stream) |
| `apps/web/src/server/praxis-client.ts` | Server-direct `Client<paths>` (server-only, JWT) |
| `apps/web/src/server/praxis.ts` | Transparent BFF forwarder (allowlisted on `v1/tasks`) |
| `apps/web/src/server/tasks.ts` | RSC `listTasks` / `getActiveTask` via server client |
| `apps/web/src/components/workbench/task-run-provider.tsx` | Provider: `seedTask`, `cancelTask`, `sendFollowUp` |
| `apps/web/src/components/workbench/tasks/all-tasks-list.tsx` | Client list component (cursor paging) |
| `apps/web/src/app/[locale]/(app)/app/tasks/page.tsx` | `/app/tasks` route |
| `apps/web/src/components/workbench/sidebar/task-section.tsx` | "View all" link |
| `apps/web/src/components/workbench/chat/workbench-chat.tsx` | Cancel button + follow-up composer |
