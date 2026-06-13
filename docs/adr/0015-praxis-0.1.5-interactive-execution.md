# ADR-0015: praxis 0.1.5 interactive execution

## Status

Accepted (2026-06-13)

## Context

ash vendored the praxis HTTP contract under the label `0.1.0`, but that copy was actually a
**pre-freeze draft** — it predated the real 0.1.0 freeze (`ErrorBody {error}` instead of
`{code, message, details?}`, bare-array list responses, no `awaiting_input` status). praxis has
since published **0.1.5**, which adds two capabilities that ash's prior model (ADR-0011) could
not represent:

1. **Interactive execution** (`ask_user` / `POST /answers` / `TaskStatus.awaiting_input`): a
   running turn can pause to prompt the user for input, then resume on the same open SSE stream
   once the answer is posted.
2. **Same-session history catch-up** (`GET /v1/tasks/{id}/history`): a reconnecting client can
   page through committed history blocks, rebuild the task view-model via a pure projector, and
   re-subscribe to the live stream; the server re-emits a still-pending `ask_user` so the live
   `ask_id` is recovered.

praxis 0.1.4 also introduced `stream_end{task_status}` as a guaranteed stream terminator,
replacing the "stream closed without a terminal event → failed" heuristic ash used previously.

ADR-0011 defined a strictly one-shot model (create → execute → auto-complete on
`turn_completed`) with session-only state (no reconnect, no persistence). A task waiting for user
input would have been incorrectly auto-failed on stream close under that model. Additionally,
`RuntimeEvent` was hand-mirrored in `runtime-events.ts` because the event union was absent from
the OpenAPI document; with 0.1.5, both `RuntimeEvent` and `HistoryEvent` are defined in the
OpenAPI and can be generated.

## Decision

1. **Re-vendor the contract at praxis tag `openapi-v0.1.5`.** Copy `openapi/praxis.yaml` +
   `openapi/schemas.json` from tag `openapi-v0.1.5` into `apps/web/src/lib/praxis/contract/` and
   regenerate `apps/web/src/lib/praxis/generated.ts` with `openapi-typescript`. The generated
   output gains: `ErrorBody {code, message, details?}`, `TaskList`/`ProjectList` envelopes,
   `AnswerRequest {ask_id, answer}`, `TaskStatus` value `awaiting_input`,
   `StartTaskRequest.skill_hint?`, and the discriminated unions `RuntimeEvent`, `HistoryEvent`,
   `HistoryItem`, `TaskHistoryPage`.

2. **Both event unions are now generated — the hand-mirrored `RuntimeEvent` is retired.** The
   hand-authored union in `runtime-events.ts` is deleted; the file becomes a thin curated
   re-export of the generated wire and event types. This **supersedes ADR-0011 §1** (keep
   `RuntimeEvent` in sync by hand).

3. **Add `awaiting_input` status and `pendingQuestion` to the `Task` view-model; `ask_user`
   parks the task, `POST /answers` resumes it on the same open stream.** The reducer handles
   `ask_user {ask_id, text, attachments}` → `status: "awaiting_input"` + `pendingQuestion`;
   `turn_resumed` → clears `pendingQuestion` + `status: "running"`. Closing the SSE stream is
   never a cancel; the stream is a read-only window on a server-side driver. This **relaxes
   ADR-0011 §5–6**: a task is no longer auto-completed while it is waiting for the user;
   `awaiting_input` is non-terminal and never auto-failed on stream close.

4. **Adopt same-session `/history` catch-up.** On stream re-attach (network drop or
   navigate-away-and-back within the SPA), the provider pages `GET /v1/tasks/{id}/history`
   (following `next_cursor` until absent), passes the full event set to the pure `historyToTask`
   projector to rebuild committed blocks, then re-subscribes to the live stream. The server
   re-emits a still-pending `ask_user` so the live `ask_id` is recovered; clients dedup by
   `ask_id`. ash still does not persist runs itself — catch-up reads praxis. This is a **bounded
   exception to ADR-0011 §7** (session-only). Full reload / deep-link reconnect (cold-load from
   URL) remains deferred.

5. **`stream_end{task_status}` is the authoritative stream terminator.** On receiving
   `stream_end`, the reducer applies a terminal mapping: praxis `completed` → `completed`;
   `failed`/`cancelled` → `failed`. `awaiting_input` and other non-terminal statuses in
   `task_status` are never treated as failures. The prior "stream closed without a terminal event
   → failed" heuristic is retained only as an abnormal-close fallback.

6. **Deferred (documented, not dropped):**
   - Full reload / deep-link reconnect: task addressable by URL, rebuilt from `GET /v1/tasks/{id}`
     + `/history` on cold load. Needs task routing + a from-history bootstrap path.

     > Superseded by ADR-0016 (2026-06-13): deep-link cold load is now implemented (server seed via `GET /v1/tasks/{id}` + `seedTask` + `useReattachOnView` history catch-up).
   - User-initiated multi-turn (`POST /messages` as free follow-up chat): remains deferred to the
     Project conversation line per ADR-0011.
   - Retry/backoff for 429/503 + `Retry-After`: errors surface, no automatic retry this slice.
   - List pagination consumers (`TaskList`/`ProjectList`): types regenerate, but no list call is
     wired; the client exposes no list method today.
   - Real artifact rendering: the provisional `.pptx` synthesis from ADR-0011 stays as-is.

## Consequences

- **Easier:**
  - Interactive Q&A is now representable: `ask_user` parks the task; `POST /answers` resumes it;
    the existing reducer + provider seam absorbs both without a new abstraction layer.
  - Both event unions (`RuntimeEvent`, `HistoryEvent`) are generated from the OpenAPI document —
    no more manual sync against the praxis Rust source.
  - Same-session reconnect is possible: a dropped stream no longer silently fails a task that
    is mid-turn or awaiting input.
- **Harder / risks:**
  - **History/live reconciliation boundary:** the two streams are documented as non-overlapping
    (completed blocks vs. live deltas), but the precise boundary at re-attach (a turn in flight
    when the stream dropped) should be verified against the fake client and, eventually, real
    praxis.
  - **`mapTaskStatus` lossiness:** the `ConversationStatus` type has no waiting state, so the
    `Conversation` adapter in `workbench-app.tsx` maps `awaiting_input` → `idle` (deliberately not
    `running`: while waiting on the user the agent is not "thinking", so the chat shows the
    `AnswerPrompt` rather than the thinking indicator). The sidebar dot uses a separate mapping in
    `lib/task-status.ts` where `awaiting_input` → `running` to read as active. The actionable
    affordance travels via sidecar `pendingQuestion`/`onAnswer` props on `WorkbenchChat` rather than
    through the adapted `Conversation`. If more of the UI later reads task status through
    `Conversation`, this adapter gap should be revisited.
  - **Same-session re-attach is wired** via `useReattachOnView(taskId)` in `workbench-app.tsx` (the
    navigate-back trigger). Because streams persist across in-session navigation, `attach` is guarded
    (no-op for unknown/terminal/already-streaming tasks); it acts only when a non-terminal stream has
    ended. Full reload / deep-link reconnect remains deferred.

## Related

- `docs/superpowers/specs/2026-06-13-praxis-interactive-execution-design.md` (source of truth for
  this slice)
- ADR-0007 (transport = SSE)
- ADR-0011 (praxis contract + one-shot model; partially superseded by this ADR)
- ADR-0012 (live transport; `httpPraxisClient` + BFF SSE proxy)
- praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)
