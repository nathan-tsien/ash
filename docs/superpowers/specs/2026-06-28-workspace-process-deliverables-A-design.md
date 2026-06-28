# Workspace Reconception — Process Timeline + Deliverables (sub-project A) — Design Spec

- Status: Approved (awaiting written review)
- Date: 2026-06-28
- Implements: ADR-0020 (workspace Process + Deliverables IA) — **with one amendment** (see below)
- Supersedes: the A spec stub `docs/superpowers/specs/2026-06-28-workspace-reconception-A-spec.md`
- Depends on: sub-project C (#42, visual vocabulary) and sub-project E (#43, ADR-0020) merged to main; rebase onto main once they land.

## Context

The task workspace today shows two static cards (Artifacts, Tools). The "artifacts" are fake:
the reducer synthesizes a placeholder `.pptx` on completion (`synthesizePptArtifact`); praxis
emits no artifact event. ADR-0020 reframed the task workspace as a pinned plan strip + a
`Process | Deliverables` tab switcher.

A data-reality check during this brainstorm changed one decision:

- **Process timeline — real.** Tool traces are derived from real `tool_use`/`tool_result`
  content blocks (`apps/web/src/lib/praxis/tool-trace.ts`).
- **Deliverables — real path exists, not yet consumed.** `agent_generated` `Attachment`s ride
  on the `Message` envelope: live via the `message_start` event and in `/v1/tasks/{id}/history`.
  Nothing reads them yet.
- **Plan — no real data.** `task.plan` is hardcoded `[]` for tasks and praxis emits no
  plan/todo/step concept. A pinned plan strip cannot be built honestly today.

### Amendment to ADR-0020

The **pinned plan strip is deferred** (no praxis plan source; building an empty/synthetic plan
would violate the no-fake discipline). The task workspace ships the **`Process | Deliverables`
tabs** now; the plan strip returns when praxis emits a real plan/todo (a future backend item).
This spec updates ADR-0020 with that amendment.

## Goals

1. Replace the synthesized artifact with **real deliverables** bound to `agent_generated`
   attachments — visible during a run (`message_start`) and on cold-load (`/history`).
2. Give the task workspace a **Process timeline** (navigable; click an event → jump to its chat
   turn) built from real tool/ask/completion events.
3. Restructure the task workspace as **`Process | Deliverables` tabs**, reusing sub-project C's
   component vocabulary; consolidate the legacy `/c/[id]` workspace variant.

## Non-goals (deferred)

- Pinned plan strip (no data — see amendment).
- Rich in-app deliverable preview (tables/charts/slides/doc rendering) — **sub-project B**.
- Typed `task_outputs` praxis contract — **sub-project D**.
- Project workspace IA changes (materials/tasks/settings stays as-is, ADR-0020).
- Any praxis contract change. A consumes the existing `Attachment` on `Message`.

## Architecture

### View-models (`packages/shared/src/types.ts` — plain types, no React/Next)

```ts
export interface Deliverable {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;            // praxis reference; fetched via the /api/praxis proxy
  kind: "file" | "image"; // from AttachmentKind
}

export type ProcessEventKind = "tool" | "ask" | "done";
export type ProcessEventStatus = "running" | "success" | "error" | "info";

export interface ProcessEvent {
  id: string;                 // tool callId, ask askId, or "done"
  kind: ProcessEventKind;
  label: string;              // e.g. tool name, "Question asked", "Completed"
  status: ProcessEventStatus;
  at: string;                 // ISO timestamp
  messageId?: string;         // originating message, for jump-to-turn
}
```

**`Task` view-model change (explicit):** remove the `artifacts: Artifact[]` field from `Task`
and replace it with `deliverables: Deliverable[]`. Keep the `Artifact` type itself in
`packages/shared` — the **project** workspace (`Conversation`/`Project.artifacts`,
`ArtifactsCard`) still uses it and is out of scope. Update every `Task` producer/consumer
accordingly: `task-run-provider.tsx` seeds `deliverables: []` (not `artifacts`), the reducer
populates `deliverables`, and `workbench-app.tsx` stops mapping `artifacts`/`plan: []` for the
task view. The task workspace no longer renders `ArtifactsCard`.

### Deliverable projection (`packages/shared`, pure)

`deliverablesFromMessages(messages): Deliverable[]` — scan messages, take
`message.attachments` where `source === "agent_generated"`, map to `Deliverable`, dedup by `id`,
preserve first-seen order. Used by both the live reducer and history projection so the result is
identical online and on cold-load (projection-parity, mirroring the existing message dedup
discipline).

### Process events (`packages/shared` or `apps/web/src/lib/praxis`, pure)

`processEvents(messages): ProcessEvent[]` — derive from message blocks:
- each `tool_use`/`tool_result` pair → one `tool` event (reuse the `tracesFromBlocks` keying by
  `callId`; carry the originating `messageId` and map status running/success/error),
- each `ask_user` → one `ask` event,
- terminal completion (task reached a terminal status) → one `done` event.
Ordered oldest→newest. This is **event navigation, not a scrubber** (ADR-0020).

### Reducer + history changes

- `runtime-event-reducer.ts`: on `message_start`, read `Message.attachments`; fold
  `agent_generated` ones into `task.deliverables` via `deliverablesFromMessages` (idempotent
  upsert by id). **Delete `synthesizePptArtifact` and its `stream_end` artifact upsert.**
- `history-projection.ts`: project `Message.attachments` so `deliverables` populate on
  re-attach/cold load.
- `task-run-provider.tsx`: seed `deliverables: []`; it updates reactively like `toolTraces`.

### Workspace shell (`apps/web/src/components/workbench/workspace/`)

- `task-workspace.tsx` → a tabbed shell: `Process | Deliverables` (client component for tab
  state). Default tab **Process**; Deliverables tab carries a **count badge** (`StatusChip`);
  **no auto-switch** on completion.
- **Process tab** — the tool-trace timeline (reuse the existing `ToolsCard` timeline visual /
  `StatusDot`) rendered over `ProcessEvent[]`; each row is clickable → scroll the chat to
  `messageId` (a `callId`/`messageId` → DOM lookup using the existing `data-message-id`
  attribute on chat turns; expose a scroll handler via the workbench layout).
- **Deliverables tab** — list of `Deliverable`s using sub-project C's card/row vocabulary:
  - `image` → inline thumbnail (src via the proxy URL),
  - other → file row with name + size + a **download** action,
  - download/open routes through the existing `/api/praxis/v1/tasks/**` proxy (auth forwarded).
    If an attachment `uri` is not under `/v1/tasks/**` (so the existing all-list rejects it),
    add a minimal authenticated passthrough; confirm the `uri` shape during implementation and
    only add the route if needed.
  - empty state when none.
- **Consolidate** the legacy `/c/[conversationId]` `workbench-workspace.tsx` into the task
  workspace (remove the third variant); verify the `/c/[id]` route renders the same tabbed
  workspace and nothing regresses.

### Attachment download/proxy

Attachment `uri`s are praxis references. The browser must fetch them through the BFF so the
`ash_access_token` is attached. The existing proxy already forwards `/api/praxis/v1/tasks/**`
with `Authorization: Bearer`. Implementation step: determine the real `uri` shape (run a task
that produces a file, or read the praxis attachment route) and either (a) rewrite `uri` →
`/api/praxis/<uri>` when it is under `/v1/tasks/**`, or (b) add a small authenticated
`/api/praxis` passthrough for the attachment path. No praxis contract change.

## Data flow (summary)

`message_start` (live) / `/history` (cold) → `Message.attachments` → `deliverablesFromMessages`
→ `task.deliverables` → Deliverables tab. Message blocks → `processEvents` → Process tab → click
→ scroll chat to `messageId`.

## Testing

Unit (vitest, `apps/web` + `packages/shared`):
- `deliverablesFromMessages`: keeps `agent_generated`, drops `user_upload`, dedups by id,
  preserves order, maps all fields incl. `kind`.
- Reducer: `message_start` with attachments populates `deliverables`; **no** synthesized artifact
  on `stream_end`; idempotent across repeated events.
- History projection: attachments → deliverables; online/cold parity (extend the existing
  projection-parity test).
- `processEvents`: tool/ask/done derivation, ordering, status mapping, `messageId` carried.
- Keep existing reducer/tool-trace/projection suites green.

Visual (no unit test): the tabbed workspace, deliverable rows, image thumbnails, Process→jump —
verified via typecheck/build + headless self-check on reachable surfaces where possible
(authenticated workbench needs live IAM+praxis; otherwise component-level review).

## Files expected to change

- `packages/shared/src/types.ts` — `Deliverable`, `ProcessEvent*`, `Task.deliverables`.
- `packages/shared/src/...` — `deliverablesFromMessages` (+ test).
- `apps/web/src/lib/praxis/runtime-event-reducer.ts` — consume attachments; remove synth pptx.
- `apps/web/src/lib/praxis/history-projection.ts` — project attachments.
- `apps/web/src/lib/praxis/tool-trace.ts` or a new `process-events.ts` — `processEvents` (+ test).
- `apps/web/src/components/workbench/task-run-provider.tsx` — seed `deliverables`.
- `apps/web/src/components/workbench/workspace/task-workspace.tsx` — tabbed shell.
- New: `process-tab.tsx`, `deliverables-tab.tsx`, `deliverable-row.tsx` (workspace dir).
- `apps/web/src/components/workbench/workbench-app.tsx` — drop the `plan: []` mapping for tasks;
  wire deliverables/process; chat-scroll handler for jump-to-turn.
- Remove/redirect `workbench-workspace.tsx` (legacy `/c/[id]`), updating its consumer.
- Possibly `apps/web/src/app/api/praxis/...` — attachment passthrough only if `uri` needs it.
- `docs/adr/0020-*.md` — amendment: plan strip deferred.
- `docs/components/workbench-workspace.md` — Process/Deliverables tabs, deliverables binding.

## Risks

- **Attachment `uri` shape unknown** → may or may not need a new proxy route. Resolve early by
  inspecting a real agent-generated attachment; the spec covers both branches.
- **Live vs history timing** → a file may only appear in `/history`; ensure a post-run/cold
  projection path so deliverables are never lost. Covered by reducing on `message_start` AND
  projecting from history.
- **Removing the synthesized artifact** changes the completion UX (no auto-deck). Acceptable —
  it was fake; real deliverables replace it.
- **Legacy container consolidation** could regress the `/c/[id]` route — verify that route
  explicitly.

## Open questions (resolve in the plan/implementation)

- Exact `Attachment.uri` shape (relative `/v1/tasks/...` vs absolute) → decides the proxy step.
- Whether the project workspace should also adopt real deliverables (currently out of scope;
  revisit after A).
