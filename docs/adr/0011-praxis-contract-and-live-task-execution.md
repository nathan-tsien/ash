# ADR-0011: praxis contract adoption and the first live task-execution slice

## Status

Accepted (2026-06-03)

## Context

Phase 1 shipped the workbench shell on mocks. The first move toward live execution needs a data pipeline
shaped to the real backend. praxis published its HTTP contract (`openapi/praxis.yaml` + `schemas.json`,
v0.1.0) and the `RuntimeEvent` runtime stream (praxis `crates/praxis-protocol/src/traits.rs` + praxis
ADR-0008). Two facts from that contract shape the design:

1. praxis emits **no artifact** today (`task_outputs` + S3 is deferred to praxis Sprint 3d); the event
   stream carries assistant text, tool dispatch, and turn-lifecycle events only.
2. A task's natural resting state after a turn is `paused` ("tasks outlive turns"); only an explicit
   `POST /v1/tasks/{id}/complete` reaches terminal `completed`. praxis ADR-0008 records that abandoned
   `paused` tasks leak their cogito session (no idle reaper yet).

ash's product model defines a Task as one-shot (create → execute → complete/failed). The transport is SSE
(see ADR-0007).

## Decision

1. **Adopt the praxis OpenAPI as the type source.** REST wire types are generated with
   `openapi-typescript` into `apps/web/src/lib/praxis/generated.ts` (`pnpm --filter @ash/web gen:praxis`).
   praxis owns the contract; ash regenerates on revision. `RuntimeEvent` is **not** in the OpenAPI (the
   `/events` body is typed `string`), so it is hand-authored in `runtime-events.ts` with the praxis Rust
   source cited; keep it in sync by hand.

2. **Isolate the wire shape behind a consumer interface + reducer.** `PraxisTaskClient`
   (`createTask`/`startTask`/`streamEvents`/`sendMessage`/`complete`/`cancel`) mirrors the praxis
   REST + SSE endpoints. A pure `runtimeEventReducer` folds `RuntimeEvent`s into ash's existing `Task`
   view-model. The UI depends only on `Task`, never on the wire shape.

3. **Ship a fake, not real transport.** `fakePraxisClient` is a local generator emitting real-shaped
   `RuntimeEvent`s for a "generate a PPT" script. `httpPraxisClient` is scaffolded but disabled — the real
   SSE path needs the BFF proxy route gated under ADR-0007. No SSE/WebSocket route handler ships in this
   slice, so the Phase-1 gate is respected.

4. **Synthesize the artifact (provisional).** Because praxis emits no artifact, the reducer synthesizes a
   placeholder `.pptx` document artifact on `turn_completed`, flagged `TODO(ash)`. Replace with a real
   mapping when praxis Sprint 3d ships `task_outputs`.

5. **paused → auto-complete.** A one-shot Task is treated as done when its turn finishes: on
   `turn_completed` ash marks it `completed` and (against real praxis) fires `POST /complete` to settle the
   FSM and release the session. Single-Task multi-turn follow-up (`/messages`) is deferred — it belongs to
   the Project main-conversation line, and would require an ash status beyond the current four.

6. **Status mapping.** praxis `draft→pending`, `running→running`, `paused|completed→completed`,
   `failed→failed`, `cancelled→failed` (ash has no `cancelled` state this slice).

7. **Session-only runs.** Created tasks live in a client `TaskRunProvider`; no server persistence. The task
   route tolerates a client-known/server-unknown id rather than 404-ing.

## Consequences

- **Easier:** Swapping the fake for real praxis is mechanical — implement `httpPraxisClient` + the BFF SSE
  route; the reducer, provider, and UI are unchanged.
- **Harder:** `RuntimeEvent` is mirrored by hand (not generated) and must track praxis manually until it
  appears in the OpenAPI.
- **Provisional seams:** artifact synthesis and the auto-complete behaviour are deliberate stand-ins, both
  documented for revisit (praxis Sprint 3d; multi-turn Task chat).
- **Deferred:** real SSE transport + BFF proxy, server-side persistence, Project live execution, real
  `.pptx` rendering.

## Related

- `docs/superpowers/specs/2026-06-03-task-live-execution.md`
- ADR-0006 (data adapter seam), ADR-0007 (transport = SSE)
- praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)
