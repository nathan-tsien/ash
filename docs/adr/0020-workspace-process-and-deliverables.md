# ADR-0020: Workspace IA — Process + Deliverables

## Status

Accepted — amends (does not supersede) ADR-0004.

## Context

ADR-0004 froze the three-pane topology and assigned the right pane the responsibility
"Plan checklist · tool traces · artifact gallery + future feature tabs." In practice the
right pane shipped as three static stacked cards, and the **artifact gallery is not real**:
praxis emits no artifact event, so the reducer synthesizes a placeholder `.pptx` on
completion (`apps/web/src/lib/praxis/runtime-event-reducer.ts`, `synthesizePptArtifact`).

The product targets output-heavy work — data analysis, document/report generation, deep
research, BI/financial analysis, self-media content. The reference experience is Manus, but
ash runs **no isolated VM/sandbox** for user tasks, so a literal live "computer" screencast
does not apply. The two Manus traits that do carry value here are (1) a navigable **process
timeline** of what the agent did and (2) a strong **deliverables** experience.

Two facts about today's data shape the decision:

- **Tool traces are real** — derived from `tool_use`/`tool_result` content blocks (ADR-0018).
- **The real deliverable seam is `Attachment`** — the praxis contract already carries an
  `Attachment` (`id, name, mime_type, size_bytes, uri, extracted_text?, kind: file|image,
  source: user_upload|agent_generated`) on history messages. `source: agent_generated`
  attachments are the genuine task outputs; the synthesized `.pptx` must be retired in favor
  of them.

ADR-0004 anticipates this kind of refinement: it explicitly allows feature modules to register
"extra tabs/panels anchored inside Workspace chrome," and only *relocating* the plan out of the
workspace (e.g. into chat bubbles) would demand a superseding ADR. We keep the plan in the
workspace, so this is an **amendment**, not a supersede.

## Decision

Refine the **task** workspace's information architecture to:

1. **Pinned plan strip** at the top of the workspace — the live plan/progress (`task.plan:
   PlanStep[]`), always visible and collapsible. This also fixes a current gap: the primary
   `/app/task/[taskId]` workspace (`task-workspace.tsx`) renders Artifacts + Tools but no plan
   card at all.

2. **A `Process | Deliverables` tab switcher** below the pinned plan.
   - **Process** — a navigable **event timeline** normalized from real data: plan-step
     transitions, `tool_use`/`tool_result` traces, `ask_user`, and terminal completion.
     Selecting an event links to its corresponding chat turn. This is **event navigation, not
     a VM screencast/scrubber** — there is no sandbox state to replay; documenting this
     prevents it from being mistaken for Manus's literal player.
   - **Deliverables** — bound to real `source: agent_generated` `Attachment`s, replacing the
     synthesized `.pptx`. Rendered by MIME with what is reachable on `Attachment.uri` today
     (image inline, link, real file download). A count badge sits on the tab. Rich in-app
     preview (tables/charts/slides/docs) is **sub-project B**, gated where noted on a richer
     `task_outputs` contract (sub-project D).

3. **View-model additions** (names fixed here; shapes/implementation are sub-project A):
   - `ProcessEvent` — normalized timeline entry derived from existing messages + tool traces
     (no new praxis contract). Carries at minimum: a kind (`plan | tool | ask | done`), a
     label, a status, a timestamp, and an optional link target (the chat turn / block).
   - `Deliverable` — projected from `Attachment` (`agent_generated`): `id, name, mimeType,
     sizeBytes, uri, kind`. Lives in `packages/shared` as a plain type (no React/Next).

4. **Scope of this IA.** The Process + Deliverables structure applies to the **task**
   workspace. The **project** workspace keeps its own structure (materials · project-tasks ·
   artifacts · settings) — a project is not a single task's process. The legacy
   `/c/[conversationId]` container (`workbench-workspace.tsx`) is flagged for **consolidation**
   into the task workspace rather than maintained as a third variant.

Topology is unchanged: still three panes; the plan stays in the workspace; the tabs live
"inside Workspace chrome" exactly as ADR-0004 permits.

## Consequences

- **Easier:** the workspace finally reflects real agent work (real timeline, real outputs);
  the plan becomes visible on the primary task route; deliverables stop being fake.
- **Harder:** requires retiring `synthesizePptArtifact` and a small view-model addition
  (`ProcessEvent`, `Deliverable`); attachment `uri` access through the BFF proxy must be
  verified (a download/stream route may be needed) — called out as a risk in the A spec.
- **Given up:** the always-everything-visible stacked layout (Process and Deliverables are now
  behind a tab each); mitigated by defaulting to the Process tab on mount (see Amendment
  2026-06: the pinned plan strip is deferred until praxis exposes real plan data).
- **Deferred:** rich in-app deliverable previews (sub-project B) and the typed `task_outputs`
  contract (sub-project D). This ADR is implemented by **sub-project A**
  (`docs/superpowers/specs/2026-06-28-workspace-reconception-A-spec.md`).

## Notes

This ADR is a decision record only; it ships no application code. Sub-project A turns it into a
spec → plan → implementation cycle.

---

## Amendment (2026-06): plan strip deferred

**Status:** Partial implementation — the `Process | Deliverables` tabs shipped; the pinned plan
strip is deferred.

**Reason.** The original decision (§Decision, point 1) called for a pinned plan strip fed by
`task.plan: PlanStep[]`. After inspection, praxis emits **no plan, todo, or step data** on any
stream event or history endpoint today. Constructing an empty or synthetic plan strip would
directly violate the project's no-fake discipline ("Forbidden: pretending mock objects equal
persisted Rust event logs" — `docs/components/workbench-workspace.md`). An invisible or
placeholder strip also provides no navigability benefit, which was the strip's sole purpose.

**What shipped (sub-project A).**

- The task workspace (`apps/web/src/components/workbench/workspace/task-workspace.tsx`) renders
  a `Process | Deliverables` tab switcher with no plan strip above it.
- **Process tab** — a clickable event timeline derived from real `tool_use`/`tool_result` content
  blocks and terminal completion events. Selecting a timeline row scrolls the chat to the
  corresponding turn (`data-message-id` scroll via `onSelectMessage`).
- **Deliverables tab** — bound to real `source: agent_generated` `Attachment`s projected from
  `task.deliverables`. Images render inline; other files offer a download link through the
  `/api/praxis` BFF proxy. A count badge sits on the tab header.
- The synthesized `.pptx` placeholder artifact (`synthesizePptArtifact`) is **retired**.
- The legacy `/c/[conversationId]` container (`workbench-shell.tsx / ConversationWorkspace`) is
  **consolidated** into a thin read-only variant that renders plan + tool traces using existing
  shared card components; it is not maintained as a separate feature path.

**Plan strip return condition.** The pinned plan strip will be restored once praxis exposes a
real plan/step data source (e.g. a `plan_step` stream event or equivalent history field). No
synthetic or empty plan strip may ship in the interim. This condition supersedes the "always
visible" claim in the original Decision §1.

**Unchanged.** Points 2–4 of the Decision are unchanged: the tab switcher, view-model types
(`ProcessEvent`, `Deliverable`), and scope boundary (task workspace vs. project workspace) all
shipped as specified. Rich in-app deliverable preview (sub-project B) and the `task_outputs`
contract (sub-project D) remain deferred.
