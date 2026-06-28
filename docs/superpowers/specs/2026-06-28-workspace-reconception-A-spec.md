# Workspace Reconception (Process Timeline + Deliverables) — Spec Stub (sub-project A)

- Status: Stub (starting point for a full brainstorm → plan cycle)
- Date: 2026-06-28
- Decided by: ADR-0020 (workspace Process + Deliverables IA)
- Depends on: ADR-0020; benefits from sub-project C (visual vocabulary) being merged first
- Blocks: sub-project B (rich deliverable canvas) for the basic-preview slice

## Purpose

Implement the task-workspace IA decided in ADR-0020: a pinned plan strip + a
`Process | Deliverables` tab switcher, on mostly-real data. This is the heart of the
workbench overhaul — it turns the polished-but-static workspace (sub-project C) into a live
process + deliverables surface.

## In scope

1. **Deliverables bound to real attachments.**
   - Retire `synthesizePptArtifact` in `apps/web/src/lib/praxis/runtime-event-reducer.ts`.
   - Add a `Deliverable` view-model (in `packages/shared`, plain type, no React/Next) projected
     from `Attachment` where `source === "agent_generated"`:
     `{ id, name, mimeType, sizeBytes, uri, kind: "file" | "image" }`.
     (Source: praxis `Attachment` schema — `id, name, mime_type, size_bytes, uri,
     extracted_text?, kind, source` — on `/v1/tasks/{id}/history` messages.)
   - Project deliverables from history (and reconcile across the live stream / catch-up window
     so they appear during and after a run).
   - Render by MIME on `Attachment.uri`: image inline, link openable, other files as a real
     download. No fabricated controls; rich preview is sub-project B.

2. **Process timeline (event navigation).**
   - Add a `ProcessEvent` view-model derived from existing message blocks + tool traces:
     `{ kind: "plan" | "tool" | "ask" | "done", label, status, at, target? }` where `target`
     links to the originating chat turn/block. No new praxis contract.
   - Timeline UI: ordered, navigable; selecting an event scrolls/links to its chat turn.
     NOT a VM screencast/scrubber (ADR-0020).

3. **Workspace shell IA.**
   - Pinned, collapsible plan strip (`task.plan`) at the top.
   - `Process | Deliverables` tab switcher (Deliverables shows a count badge).
   - Apply to the task workspace (`task-workspace.tsx`); reuse the sub-project C component
     vocabulary (card shell, `StatusChip`, `StatusDot`, tool timeline).
   - Consolidate the legacy `/c/[conversationId]` `workbench-workspace.tsx` into the task
     workspace (remove the third variant) — confirm no route regresses.

## Out of scope (deferred)

- Rich in-app deliverable viewers (tables, charts, slides, doc rendering) — sub-project B.
- Typed `task_outputs` praxis contract — sub-project D (B's richer slice depends on it).
- Any change to the project workspace IA (materials/tasks/settings stays as-is per ADR-0020).
- A literal playback scrubber / reconstructed computer state (no sandbox exists).

## Open questions (resolve during A's brainstorm)

- How is `task.plan` actually populated today (reducer-derived vs mock)? If not real yet,
  decide whether A wires it from praxis or treats it as best-effort.
- Does the BFF proxy expose `agent_generated` attachment `uri`s for browser download/stream,
  or is a new BFF route needed (auth-forwarded)? Likely a real task — verify early.
- Live-stream vs history timing for attachments: do agent-generated files arrive only in
  `/history`, requiring a post-run refresh, or also signaled on the stream?
- Tab default + completion behavior: default to Process while running; do we surface
  Deliverables on completion (badge only vs gentle switch)? Lean badge-only (no auto-switch).

## Constraints (inherited)

- Contract-first: any praxis call codegen'd from the OpenAPI contract; SSE is the only
  hand-written exception. Mock client unit-test-only; `getPraxisClient` always real.
- No cogito imports into browser packages; `packages/shared` stays React/Next-free.
- Token + component discipline per the design guidelines (sub-project C vocabulary).
- Three-pane topology unchanged (ADR-0004 / ADR-0020).

## Next step

Run a full brainstorm → writing-plans cycle for A using this stub as the starting point.
