# Task Live Execution — 登录后工作台首个真实任务（fake-driven，对齐 praxis 契约）

**Date:** 2026-06-03
**Status:** Draft
**Builds on:** `2026-05-30-task-project-product-design.md` (Task/Project IA), ADR-0006 (data adapter seam)
**External contract:** praxis OpenAPI `v0.1.0` (`nathan-tsien/praxis:openapi/praxis.yaml` + `schemas.json`), praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)

## Problem

The post-login workbench renders, but `listTasks` / `getActiveTask` return empty, so the Sidebar has no
tasks and `/app/task/[id]` 404s. There is no way to create a task, watch it execute, or produce an
artifact. We want a believable end-to-end slice: **login → type "生成一个 PPT" → watch the agent stream a
run (assistant text + tool traces) → a downloadable (placeholder) PPT artifact appears**, with the data
pipeline shaped to praxis's real wire contract so the swap to a deployed praxis is mechanical.

This is the first slice that crosses from "static mocks" toward live execution, but deliberately ships
**no real network/SSE transport** yet — a local fake drives the stream in the exact praxis wire shape.

## Scope

In scope:
- Task end-to-end **one-shot** flow, fake-driven, against the praxis-shaped client interface.
- praxis wire types **generated from praxis OpenAPI**.
- Workbench visual + interaction polish for the running state (streaming text, tool traces appearing,
  artifact entrance, sidebar status transitions).

Out of scope (deferred, explicitly):
- Real praxis HTTP/SSE transport + BFF proxy route (next slice; needs a deployed praxis).
- Project live execution (Project view stays on mocks).
- Real `.pptx` rendering — artifact is an ash-synthesized **placeholder** (praxis `task_outputs` + S3 is
  deferred to praxis Sprint 3d; the event stream carries no artifact today).
- Single-Task **multi-turn** follow-up (`/messages`) — see "paused handling" below.
- Server-side persistence of created tasks — runs live in client session state.

## praxis contract (authoritative external shape)

REST (Bearer JWT; ash already holds the iam token and forwards it):

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| createTask | `POST /v1/tasks` → `TaskSummary` | body `{title?, strategy_ref?, user_input?, project_id?}`; status `draft` |
| startTask | `POST /v1/tasks/{id}/start` → `202 TaskSummary` | body `{user_input}`; begins first turn |
| sendMessage | `POST /v1/tasks/{id}/messages` → `202` | body `{text}`; follow-up into a running task |
| events | `GET /v1/tasks/{id}/events` | **SSE**; each `data:` is a JSON `RuntimeEvent` |
| cancel | `POST /v1/tasks/{id}/cancel` → `204` | |
| complete | `POST /v1/tasks/{id}/complete` → `204` | `paused → completed` |
| list/get | `GET /v1/tasks`, `GET /v1/tasks/{id}` → `TaskSummary[]`/`TaskSummary` | |

`TaskSummary` is thin: `{ id: uuid, title?: string|null, status: TaskStatus, project_id?: uuid|null }`.
Rich content (messages, tool traces) is **reconstructed from the SSE stream**, not REST.

`TaskStatus` (praxis): `draft | running | paused | completed | failed | cancelled`.

`RuntimeEvent` — tagged union, `{"type": "<snake_case>", ...}`, 11 variants (mirrors cogito `StreamEvent`):

| `type` | Fields | ash mapping |
|--------|--------|-------------|
| `turn_started` | — | task → running |
| `turn_paused` | — | cogito-internal; **ignored** (does not change task status) |
| `turn_resumed` | — | (multi-turn; ignored this slice) |
| `turn_cancelled` | — | task → failed (see status map) |
| `turn_completed` | — | finalize assistant message; synthesize artifact; task → completed |
| `turn_failed` | `{reason}` | task → failed; surface reason |
| `text_delta` | `{chunk}` | append to current assistant message |
| `thinking_delta` | `{chunk}` | optional reasoning channel (collapsed; may render as subtle "thinking") |
| `skill_activation_requested` | `{skill_name}` | optional tool-trace-like row ("activating skill …") |
| `tool_dispatch_started` | `{call_id, tool_name, args}` | new `ToolTrace` (status running, start timestamp) |
| `tool_dispatch_ended` | `{call_id, ok, error_message?}` | close trace → success/error + client-computed duration |

Note: no artifact event exists. The PPT artifact is **ash-synthesized** on `turn_completed` (provisional
seam; replace with real mapping when praxis Sprint 3d ships `task_outputs`).

## Architecture

A client-consumable execution pipeline. The UI depends only on the existing ash `Task` view-model; the
praxis wire shape is isolated behind a client interface + reducer.

```
Composer send (/app home)
  → PraxisTaskClient.createTask({ user_input })        // TaskSummary (draft)
  → PraxisTaskClient.startTask(id, user_input)          // 202 (running)
  → for await (ev of PraxisTaskClient.streamEvents(id)) // AsyncIterable<RuntimeEvent>
       → runtimeEventReducer(taskRunState, ev)          // RuntimeEvent → ash Task view-model
       → TaskRunProvider updates React state
       → existing Chat / ToolsCard / ArtifactsCard / Sidebar re-render
  → on turn_completed: synthesize placeholder artifact; (real praxis) POST /complete
```

### Client interface (shaped to praxis endpoints)

```ts
interface PraxisTaskClient {
  createTask(req: CreateTaskRequest): Promise<TaskSummary>;
  startTask(id: string, userInput: string): Promise<TaskSummary>;
  streamEvents(id: string): AsyncIterable<RuntimeEvent>;
  sendMessage(id: string, text: string): Promise<void>; // scaffolded; not wired this slice
  complete(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}
```

Two implementations behind an env flag (default = fake):
- `fakePraxisClient` — local async generator emitting **real-shaped** `RuntimeEvent`s for a "生成 PPT"
  script: `turn_started` → several `text_delta` → 2–3 `tool_dispatch_started/ended` pairs →
  `turn_completed`. No network; Phase-1-safe.
- `httpPraxisClient` — real praxis (fetch + SSE). **Scaffolded but not enabled** this slice; the SSE path
  needs a BFF proxy route (`/api/praxis/...`) that forwards the JWT — that route is the gated Phase 2 piece
  and is deferred.

### Reducer

`runtimeEventReducer(state, event)` folds `RuntimeEvent` into ash's `Task` (`messages`, `toolTraces`,
`artifacts`, `status`). Pure, unit-testable. The single place wire shape meets the view-model.

### State holder

`TaskRunProvider` (client context) holds tasks created during the session + their live run state.
`/app` and `/app/task/[id]` read active runs from it on the client. `server/tasks.ts` keeps its SSR
list/get role (may seed a couple of mock tasks); created runs are **session-only**, no persistence.

### Status mapping (praxis → ash `TaskStatus`)

| praxis | ash | note |
|--------|-----|------|
| `draft` | `pending` | |
| `running` | `running` | |
| `paused` | `completed` | one-shot: turn done == task done (see below) |
| `completed` | `completed` | |
| `failed` | `failed` | |
| `cancelled` | `failed` | ash has no `cancelled`; map to failed this slice |

### paused handling (researched decision)

praxis lands every finished turn in `paused` ("tasks outlive turns"); only an explicit `POST /complete`
reaches terminal `completed`. praxis ADR-0008 records a known limitation: abandoned-`paused` tasks leak
their cogito `SessionHandle` + driver (no idle reaper). The ash product model defines a Task as one-shot
(create → execute → complete/failed).

Decision: **auto-complete.** On the `turn_completed` event, ash marks the task `completed` and synthesizes
the artifact; against real praxis it also fires `POST /complete` to settle the FSM and release the session.
Single-Task multi-turn follow-up (`/messages`) is **deferred** — it belongs to the Project main-conversation
line per the product design, and would require an ash status beyond the current four. Revisit when
multi-turn Task chat is wanted.

## UI wiring (reuse existing components, no new layout)

- **Home `/app`**: central composer send → `createTask` + `startTask` → route to `/app/task/[id]` →
  start consuming the stream. (Routing choice: navigate to the task route, not in-place mount, to keep a
  shareable/refresh-stable URL and reuse the existing page shell.)
- **Chat**: append the user bubble; stream the assistant message via `isStreaming`; keep the existing
  `status === "running"` thinking placeholder during the turn.
- **ToolsCard**: `tool_dispatch_started` → running row; `tool_dispatch_ended` → success/error + duration.
- **ArtifactsCard**: synthesized PPT artifact enters on `turn_completed` (GSAP entrance). Download =
  placeholder asset / stub-open toast (per existing `document` kind behavior).
- **Sidebar**: the new task appears; status transitions idle/running(pulse)/completed(check) per the
  existing status pigments.

## Visual / interaction polish (the "feels like it's running" core)

Streamed token cadence, tool traces surfacing one by one, artifact entrance, sidebar status transitions,
an overall execution-timeline rhythm. Honors `prefers-reduced-motion` via the existing GSAP `matchMedia`
setup and reuses `lib/animations` presets. Implemented with the frontend-design skill for quality.

## Type generation

Generate praxis wire types from the OpenAPI with `openapi-typescript` into `apps/web/src/lib/praxis/`
(transport-facing per ADR-0006; not `packages/shared`, which stays scaffolding). A workspace script
regenerates them; treat the generated file as build output (do not hand-edit). When praxis revises the
contract, regenerate.

## File plan (apps/web)

| Path | Role |
|------|------|
| `src/lib/praxis/generated.ts` | Types generated from praxis OpenAPI (do not edit) |
| `src/lib/praxis/client.ts` | `PraxisTaskClient` interface + factory (env-selected impl) |
| `src/lib/praxis/fake-client.ts` | Local generator emitting real-shaped `RuntimeEvent`s (PPT script) |
| `src/lib/praxis/http-client.ts` | Real praxis impl, scaffolded + disabled |
| `src/lib/praxis/runtime-event-reducer.ts` | `RuntimeEvent` → ash `Task` view-model |
| `src/components/workbench/task-run-provider.tsx` | Client context holding session task runs |
| `src/server/tasks.ts` | Keeps SSR list/get (may seed mocks); unchanged signatures |
| `src/app/[locale]/(app)/app/task/[taskId]/page.tsx` | Must tolerate a client-known/server-unknown task: when `getActiveTask` is undefined, render the workbench shell in a "pending run" state (client hydrates from `TaskRunProvider`) instead of `notFound()`. Only 404 for ids unknown to both server and a known-bad shape. |

## Testing posture

Per AGENTS.md Phase 1 testing norms: the reducer is **non-trivial client logic isolated from mocks**, so
it gets unit tests (event sequences → expected `Task` state, including status map + artifact synthesis).
UI wiring follows existing component-test patterns where cheap. The fake client's script is a fixture, not
a contract.

## Documentation impact

- This spec.
- New ash ADR: adopt praxis OpenAPI as the generated type source; record artifact-synthesis as a
  provisional seam; record paused→auto-complete decision.
- ash ADR-0007 (transport): advance Proposed → Accepted = **SSE for events + POST for control**, aligning
  with praxis ADR-0008. Real SSE route handler remains gated until the next slice.
- Update `docs/components/workbench-chat.md` and `workbench-workspace.md` for the running-state behavior.

## Risks / notes

- Wire shape is praxis-owned; if praxis revises before this lands, regenerate types and adjust the reducer
  only.
- Artifact synthesis is a deliberate stand-in; flag clearly in code (`// TODO(ash): replace with praxis
  task_outputs mapping when Sprint 3d ships`).
- Keeping runs session-only avoids premature server-state design; a refresh mid-run loses the run (a
  pending-task hydrate exists via SSR mocks). Acceptable for this slice.
</content>
</invoke>
