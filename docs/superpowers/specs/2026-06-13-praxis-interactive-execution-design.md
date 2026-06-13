# Praxis 0.1.5 Interactive Execution — `ask_user` + Same-Session History Catch-up

**Date:** 2026-06-13
**Status:** Draft
**Builds on:** `2026-06-06-praxis-live-transport.md` (httpPraxisClient + BFF SSE proxy), ADR-0006 (data adapter seam), ADR-0007 (transport = SSE), ADR-0011 (praxis contract adoption + one-shot task model), ADR-0012 (live transport)
**External contract:** praxis OpenAPI `v0.1.5` (`github.com/nathan-tsien/praxis`, tag `openapi-v0.1.5`: `openapi/praxis.yaml` + `openapi/schemas.json`), praxis `crates/praxis-protocol/src/traits.rs` (RuntimeEvent), praxis ADR-0008 (task FSM)
**Supersedes (partial):** ADR-0011 §1 (RuntimeEvent hand-mirror), §5–7 (strict one-shot / session-only) — to be recorded in a new ADR-0015.

## Problem

ash consumes praxis through a hand-vendored OpenAPI contract. Two facts make the current state stale:

1. The vendored contract labeled `0.1.0` is actually a **pre-freeze draft** — it predates the real 0.1.0
   freeze (old `ErrorBody {error}`, bare-array list responses, no `awaiting_input`). praxis has since
   published **0.1.5**.
2. praxis 0.1.5 ships **interactive execution**: a turn can pause to ask the user a question
   (`ask_user` / `POST /answers` / `TaskStatus.awaiting_input`), and a **history catch-up** endpoint
   (`GET /v1/tasks/{id}/history`) lets a reconnecting client rebuild a task's committed conversation
   before re-subscribing to the live stream.

ash's product model (ADR-0011) is strictly one-shot (create → execute → auto-complete on `turn_completed`)
and session-only (no persistence, no reconnect). It cannot represent a task that is waiting for the user,
and its stream lifecycle relies on a "stream closed without a terminal event → failed" heuristic that the
new `stream_end` frame makes obsolete.

This slice upgrades the contract to 0.1.5 and uses the new surface to support interactive task execution
plus same-session stream re-attach.

## Scope

In scope:

- **Contract re-sync** to praxis 0.1.5: re-vendor `praxis.yaml` + `schemas.json`; regenerate `generated.ts`.
  Both event unions (`RuntimeEvent`, `HistoryEvent`) are now defined in the OpenAPI and become **generated**
  types — the hand-authored mirror in `runtime-events.ts` is retired.
- **Interactive Q&A:** `ask_user` pauses a task into `awaiting_input` with a `pendingQuestion`; the user
  answers; `POST /answers` resumes the turn on the same open stream.
- **Same-session history catch-up:** when an in-session task's stream needs re-attaching (network drop, or
  navigate-away-and-back within the SPA), the provider calls `GET /history` to reconcile committed blocks,
  then re-subscribes. The server re-emits a still-pending `ask_user` on subscribe so the live `ask_id` is
  recovered; clients dedup by `ask_id`.
- **`stream_end` as the authoritative terminator**, replacing the abnormal-close heuristic.
- **`notify_user`** rendered as a conversation message.

Out of scope (deferred, explicitly — not silently dropped):

- **Full reload / deep-link reconnect** (task addressable by URL, rebuilt from `GET /v1/tasks/{id}` +
  `/history` on cold load). Needs task routing + a from-history bootstrap path. Same-session re-attach only.
- **User-initiated multi-turn** (`POST /messages` as free follow-up chat) — remains deferred to the Project
  conversation line per ADR-0011.
- **Retry/backoff** for 429/503 + `Retry-After`. Errors surface; no automatic retry this slice.
- **List pagination consumers** (`TaskList`/`ProjectList` envelopes): types regenerate, but no list call is
  wired (the client exposes no list method today).
- **Real artifact rendering**: the provisional `.pptx` synthesis from ADR-0011 stays as-is.
- **Live end-to-end verification** against a deployed praxis: build-to-contract, verified by unit tests +
  the fake client + mocked upstream, consistent with ADR-0012's posture.

## Approach

Extend ash's existing seam rather than introduce a new abstraction. ash already isolates the wire shape
behind a `PraxisTaskClient` interface and a **pure `runtimeEventReducer`** that folds delta events into the
`Task` view-model, orchestrated by the stateful `TaskRunProvider`. This slice:

- folds the new **delta** variants through the existing reducer;
- adds a separate **bulk** projector for `/history` (history is already "completed blocks"; folding it
  event-by-event buys nothing) — kept pure and independently testable;
- confines the only new async/stateful behavior (the `answer` action, the re-attach flow) to the provider.

Rejected alternatives: unifying both event unions into one internal `TaskEvent` model (over-abstraction for
two genuinely different shapes — deltas vs. blocks); and doing the history rebuild imperatively inside the
provider (moves non-trivial mapping out of pure, testable code, against the repo's grain).

## Contract re-sync (prerequisite)

1. Copy `openapi/praxis.yaml` + `openapi/schemas.json` from tag `openapi-v0.1.5` into
   `apps/web/src/lib/praxis/contract/`. Run `pnpm --filter @ash/web gen:praxis`.
2. `generated.ts` gains: `ErrorBody {code, message, details?}` (was `{error}`), `TaskList` / `ProjectList`
   envelopes, `AnswerRequest {ask_id, answer}`, `TaskStatus` value `awaiting_input`,
   `StartTaskRequest.skill_hint?`, and the now-generatable discriminated unions `RuntimeEvent`,
   `HistoryEvent`, `HistoryItem`, `TaskHistoryPage`.
3. `runtime-events.ts` becomes a thin curated re-export of the generated wire + event types. The
   hand-authored `RuntimeEvent` union is deleted. (Supersedes ADR-0011 §1.)

The full additive/breaking delta vs. the vendored pre-freeze draft is recorded in the new ADR.

## State model (`@ash/shared/src/types.ts`)

```ts
export type TaskStatus =
  | "pending" | "running" | "awaiting_input" | "completed" | "failed";

export interface PendingQuestion {
  askId: string;          // live correlation id; required to answer
  text: string;           // question shown to the user
  attachments: string[];  // workspace-relative refs; [] when none
}

export interface Task {
  // ...existing fields...
  status: TaskStatus;
  pendingQuestion?: PendingQuestion; // present iff status === "awaiting_input"
}
```

Status-switch consumers gaining an `awaiting_input` branch:

- the sidebar status chip — a distinct "needs you" affordance;
- `mapTaskStatus` in `workbench-app.tsx` — maps `awaiting_input` → `running` for the `Conversation`
  adapter (`ConversationStatus` has no waiting state); the actionable affordance is delivered via sidecar
  props (see UI section), not through the adapted `Conversation`.

## Components

| Component | File | Change |
|---|---|---|
| Generated types | `lib/praxis/generated.ts` | Regenerated from 0.1.5, incl. both event unions |
| Wire re-exports | `lib/praxis/runtime-events.ts` | Thin re-export; hand-mirror removed |
| Client interface | `lib/praxis/client.ts` | `PraxisTaskClient` += `answer(id, askId, answer): Promise<void>`, `history(id, cursor?): Promise<TaskHistoryPage>` |
| HTTP transport | `lib/praxis/http-client.ts` | Implement `answer` (POST `/v1/tasks/{id}/answers`, 202) and `history` (GET `/v1/tasks/{id}/history`); thrown transport errors carry `ErrorBody.code` |
| Fake transport | `lib/praxis/fake-client.ts` | Scripted run emits an `ask_user` mid-turn, honors `answer()` → `turn_resumed` → completion, serves `history()` from its log, ends with `stream_end` |
| Delta reducer | `lib/praxis/runtime-event-reducer.ts` | New cases (below) |
| History projector (new) | `lib/praxis/history-projection.ts` | Pure `historyToTask(seed, events, labels) → Task` (events already paged + ordered by the provider) |
| Provider | `components/workbench/task-run-provider.tsx` | `answer(taskId, text)` action; re-attach flow; `stream_end`-driven termination |
| Chat affordance | `components/workbench/chat/*`, `workbench-app.tsx` | Sidecar `pendingQuestion` + `onAnswer` props threaded to `WorkbenchChat`; visual design by frontend-design |

### Delta reducer cases (`runtimeEventReducer`)

- `ask_user {ask_id, text, attachments}` → `status: "awaiting_input"`, set `pendingQuestion`.
- `turn_resumed` → clear `pendingQuestion`, `status: "running"`.
- `notify_user {text, attachments}` → append an assistant/system message (attachment refs noted via injected
  labels, kept i18n-clean per IMPL-3).
- `stream_end {task_status}` → authoritative terminal mapping: praxis `completed` → `completed`,
  `failed`/`cancelled` → `failed`. `awaiting_input` / non-terminal `task_status` is **not** treated as a
  failure.
- `turn_completed.stop_reason === "max_tokens"` → append a truncation notice (injected label). Other/absent
  `stop_reason` unchanged. One-shot auto-complete (ADR-0011 §5) is retained for the normal path.
- Unknown `type` → ignored (existing `default` branch); consumers tolerate variant growth.

### History projector (`historyToTask`)

Pure function. `/history` returns newest-first pages of `HistoryEvent` (completed blocks:
`user_message`, `assistant_message`, `thinking`, `tool_use`, `tool_result`, `notify_user`, `ask_user`,
`turn_completed`, `turn_failed`). The **provider** pages through `/history` (following `next_cursor` until
null/absent), concatenates, and hands the projector the full event set; the projector reverses to
chronological and folds into `messages` / `toolTraces` / `artifacts` on a seeded `Task`. A draft task
returns an empty page → seed unchanged. A historical `ask_user` has **no**
`ask_id`, so it projects as read-only context; it becomes actionable only once the live re-subscribe
re-emits the pending question with its `ask_id`.

## Data flow / lifecycle

- **Happy path (no question):** `createTask` → `startTask` → delta stream → `turn_completed` (auto-complete)
  → `stream_end{completed}` → `complete()`.
- **Interactive path:** …deltas… → `ask_user` → reducer sets `awaiting_input` + `pendingQuestion`; UI renders
  the prompt → user submits → `provider.answer(taskId, text)` → `POST /answers {ask_id, answer}` (202);
  optimistic clear → `running` → server emits `turn_resumed` on the **same open stream** → more deltas →
  `turn_completed` → `stream_end`. (Closing the stream is never a cancel; the stream is a read-only window
  on a server-side driver.)
- **Re-attach (same session):** stream drops or the user returns to the task → provider re-subscribes:
  `GET /history` → `historyToTask` reconciles committed blocks → subscribe `/events` → server re-emits a
  pending `ask_user` (recovers live `ask_id`) → dedup by `ask_id` → continue. The live stream is
  live-only (no replay); `/history` supplies the gap.
- **Termination:** driven by `stream_end{task_status}`, replacing the current
  `task-run-provider.tsx` "closed without terminal event → failed" heuristic. `awaiting_input` keeps the
  stream open and is never auto-failed.

## UI affordance

The visual and layout design is produced with the **frontend-design** skill during implementation. This
spec fixes only the functional contract:

- When `status === "awaiting_input"`, render `pendingQuestion.text` (and any attachment refs) in chat
  context.
- Provide an answer input; submit calls `onAnswer(text)`, which routes to `provider.answer(taskId, text)`.
- The input clears and disables while the answer is in flight; normal composition restores on `turn_resumed`.
- Accessibility: focus moves to the prompt on appearance; an `aria-live` region announces the question.
- Visual treatment uses `docs/design-guidelines.md` tokens only (no rogue palette literals; ADR-0013/0014).

Fixing the existing local-echo stub behavior of the bottom `Composer` is out of scope beyond what the
answer flow requires.

## Error handling

- `answer()`: `202` accepted. `409` (no longer pending / already answered) → clear the local
  `pendingQuestion` and trust the live stream as source of truth. `404` → surface as task failure.
- Transport errors thrown by `http-client` carry `ErrorBody.code` for future code-based dispatch. No
  retry/backoff this slice; 429/503 + `Retry-After` handling is deferred (documented).
- Re-attach failure (history fetch or re-subscribe error) → mark the task `failed` rather than hang,
  consistent with current abnormal-termination handling.

## Testing (TDD)

- `runtime-event-reducer.test.ts`: `ask_user` → awaiting_input + pendingQuestion; `turn_resumed` → clear;
  `notify_user` → message; `stream_end` → terminal mapping (completed / failed / non-terminal);
  `stop_reason: max_tokens` → notice; unknown-`type` tolerance.
- `history-projection.test.ts` (new): newest-first → chronological ordering; each `HistoryEvent` variant →
  Task field; empty (draft) page → seed unchanged; ask_user-without-ask_id → read-only.
- `fake-client`: drives an end-to-end interactive script (ask → answer → resume → complete) reused by
  provider + component tests.
- `http-client.test.ts`: `answer` / `history` request shape + `ErrorBody.code` surfacing (mocked fetch);
  provider re-attach + `ask_id` dedup.
- Component test: `awaiting_input` renders the prompt; submit invokes `onAnswer`; input clears.
- Gates: `pnpm lint`, `pnpm typecheck`, `pnpm build`, filtered tests green.

## Documentation / ADR impact

- **New ADR-0015** "praxis 0.1.5 interactive execution," recording: contract version correction
  (pre-freeze → 0.1.5) and the additive/breaking deltas; supersession of ADR-0011 §1 (hand-mirror →
  generated) and the relaxations of §5–7 (`awaiting_input` is non-terminal; same-session catch-up adds a
  bounded exception to "session-only").
- Update `docs/components/*` for the chat pane (question/answer affordance) and the task/inventory status
  surface (`awaiting_input`).

## Risks / open questions

- **History/live reconciliation precision:** the two streams are documented as non-overlapping (blocks vs.
  deltas), but the exact boundary at re-attach (a turn in flight when the stream dropped) should be verified
  against the fake client's scripted gap and, eventually, real praxis.
- **`mapTaskStatus` lossiness:** collapsing `awaiting_input` → `running` for the `Conversation` adapter is
  acceptable only because the affordance travels via sidecar props; if more of the UI later reads status
  through `Conversation`, this should be revisited.
