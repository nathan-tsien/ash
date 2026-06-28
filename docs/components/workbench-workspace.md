# Workbench Workspace -- structured agent trace rail

Purpose: contextual right-rail displaying **artifacts**, **execution details**, **materials**, and **project configuration** depending on the active view mode. Two workspace variants exist: `TaskWorkspace` and `ProjectWorkspace`.

Forbidden: pretending mock objects equal persisted Rust event logs -- label mocks clearly in Storybook/tests if divergence surfaces.

## View mode dispatch

| `WorkbenchViewMode` | Workspace component | Route |
|---------------------|---------------------|-------|
| `task` | `TaskWorkspace` | `/app/task/[taskId]` |
| `project` | `ProjectWorkspace` | `/app/project/[projectId]` |
| `home` | Hidden or placeholder | `/app` |

Both workspace variants share the same outer chrome: `w-[380px]`, `border-l border-border`, `bg-workspace`, with a header bar displaying a panel icon + title.

**Shared card shell.** Every section card inside both workspace variants uses a single shared surface: `rounded-lg border border-border bg-card p-3`. Section cards do not use `<Separator>` between them; vertical rhythm comes from `space-y-4 p-4` in the scroll container (SPACE-5, PRIN-2). Card headers use a `StatusChip` (from `packages/ui`) to surface compact progress or count summaries (IMPL-7).

## TaskWorkspace

Displays the task's process timeline and deliverables for a single Task via a `Process | Deliverables` tab switcher. Component: `apps/web/src/components/workbench/workspace/task-workspace.tsx`.

**Plan strip: deferred.** Praxis emits no plan/todo/step data today. A pinned plan strip would require a synthetic or empty state, which violates the no-fake discipline. The strip returns when praxis exposes a real plan data source (see ADR-0020 Amendment 2026-06).

### Layout

```
+-----------------------------------+
| [icon] Workspace                  |
|-----------------------------------|
|  [Process]  Deliverables (n)      |
|-----------------------------------|
|  (o) tool_use_1                   |  <- Process tab (default)
|  (o) tool_use_2                   |
|  (o) ask_user                     |
|  (o) done                         |
+-----------------------------------+
```

```
+-----------------------------------+
| [icon] Workspace                  |
|-----------------------------------|
|   Process  [Deliverables (2)]     |
|-----------------------------------|
|  [image preview]                  |  <- Deliverables tab
|  filename.png          12 KB      |
|  +------+ [Download]              |
|  report.pdf           340 KB      |
+-----------------------------------+
```

The active tab is highlighted with `bg-accent`; count badge on the Deliverables tab renders only when `deliverables.length > 0`.

### Default tab

The workspace mounts with `tab = "process"` (no auto-switch). Tab state is local to the component; there is no persisted or URL-driven tab.

### Props

```typescript
interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
  onSelectMessage?: (messageId: string) => void;
}
```

`onSelectMessage` is called when the user clicks a timeline event that carries a `messageId`, scrolling the chat pane to that turn.

### Process tab (`ProcessTab`)

Component: `apps/web/src/components/workbench/workspace/process-tab.tsx`.

Renders a **vertical timeline rail** (`border-l border-border`) derived from real runtime events via `processEvents(task.messages, { askToolName, done })` (`@ash/shared`). Each entry is a `ProcessEvent`:

| `ProcessEvent.kind` | Source | `StatusDot` variant |
|---------------------|--------|---------------------|
| `tool` | `tool_use`/`tool_result` content blocks | `success` / `running` / `error` |
| `ask` | `ask_user` tool invocation | `idle` |
| `done` | terminal `stream_end` (completed / failed) | `success` / `error` |

Each row renders a mono chip (`<code>`) showing `ev.label`. Rows with a `messageId` are clickable buttons that call `onSelectMessage(messageId)`, scrolling the chat to the corresponding turn (`data-message-id` attribute). Rows without a `messageId` (e.g. an in-flight running event) render as non-interactive (`disabled`, `cursor-default`).

When `events.length === 0`, an empty-state paragraph is shown (`t("processEmpty")`).

Orientation: **oldest top, newest bottom** (matches chat reading order). Changing orientation requires documenting rationale + migrating fixtures.

### Deliverables tab (`DeliverablesTab`)

Component: `apps/web/src/components/workbench/workspace/deliverables-tab.tsx`.

Renders real `source: agent_generated` `Attachment`s projected into `Deliverable[]` on `task.deliverables`. The synthesized `.pptx` placeholder artifact (`synthesizePptArtifact`) is **retired** — no fake deliverables.

Each `Deliverable` renders via `DeliverableRow` (`deliverable-row.tsx`):

| `Deliverable.kind` | Rendering |
|--------------------|-----------|
| `image` | Inline `<img>` preview (`max-h-48 object-cover`) inside a linked card; clicking opens the image in a new tab |
| `file` (and other) | Icon + name + size + `<a download>` button |

All URLs are resolved through `deliverableHref(uri)` (`apps/web/src/lib/praxis/deliverable-href.ts`), which routes praxis-relative paths through the `/api/praxis` BFF proxy so the session access token is attached. Non-praxis `https://` URLs pass through unchanged; absolute praxis URLs (whose pathname starts with `/v1/tasks/`) are reduced to the `/api/praxis` path and routed through the same BFF proxy.

**Rich in-app preview (tables/charts/slides/docs) is sub-project B**, gated on a richer `task_outputs` contract (sub-project D).

When `deliverables.length === 0`, an empty-state paragraph is shown (`t("deliverablesEmpty")`).

**Data timing — `/history` catch-up.** Praxis carries `agent_generated` attachments only on `/history` `Message`s, not on the live SSE stream (`message_start` opens an empty envelope). So the provider (`task-run-provider.tsx`) pulls `/history` once at the points where attachments become available: (1) immediately after a run reaches a terminal status (`runStream`), and (2) on a terminal-task cold-load with no messages yet (`attach`). Both **preserve the streamed terminal status** — they strip any re-inferred `pendingQuestion` and keep `completed`/`failed`, rather than letting `historyToTask` re-infer `awaiting_input` from an ask block that was resolved out-of-band (the answer endpoint, not a `tool_result`). The shared `fetchHistoryTask` helper is reused by both paths and by the non-terminal re-subscribe. The deliverable projection is parity-correct given identical message input (`deliverablesFromMessages`), covered by `projection-parity.test.ts` and the `task-run-provider` "surfaces deliverables from /history after a run completes" test.

### Count badge

The Deliverables tab button renders a `StatusChip` (variant `success`) showing `deliverables.length` when at least one deliverable is present. It is absent when the list is empty.

### Deliverable canvas (`DeliverableCanvas`) — sub-project B

Clicking a deliverable row opens an in-app **canvas** (`@ash/ui` `Dialog`, controlled by the
Deliverables tab's `selected` state) that renders the deliverable by MIME type — no new browser
tab for previewable types. Component: `apps/web/src/components/workbench/workspace/deliverable-canvas.tsx`;
viewers under `deliverable-viewers/`.

- **Viewer registry** `pickDeliverableViewer(mimeType, name)` → `image | pdf | markdown | code | text | none`
  (MIME first, file-extension fallback).
- **Viewers:** image (`<img>`), pdf (`<iframe>`), markdown (react-markdown + remark-gfm +
  rehype-highlight, `prose-chat` styles), code (fenced + highlight, language from extension),
  text (`<pre>`), and `NoPreview` (message + download) for unsupported types.
- **Text fetch:** `useDeliverableText(uri)` fetches text-family content through the `/api/praxis`
  BFF proxy (cookie auth), capped at 512 KB (over-cap → "too large, download instead"); aborts on
  unmount/uri change. Image/PDF stream directly from the proxied URL (no fetch hook).
- **Actions:** every canvas offers **download** and **open-in-new-tab**; the row keeps its own
  download action (with `stopPropagation` so it does not also open the canvas). All URLs resolve
  through `deliverableHref` (never raw `uri`).
- **Scope:** B1 covers file/MIME deliverables. Structured previews (data tables, charts, slide
  decks) are **B2**, gated on sub-project D (typed `task_outputs`) — see
  `docs/superpowers/specs/2026-06-28-deliverable-canvas-B2-stub.md`.

### PlanCard (shared — used by ConversationWorkspace only)

`PlanCard` (`apps/web/src/components/workbench/workspace/plan-card.tsx`) renders `PlanStep[]` as an ordered checklist with a progress `StatusChip` and a 2px left accent rail on the running step. It is **not used in TaskWorkspace** (plan data is deferred). It is retained as a shared component used by `ConversationWorkspace` (see below).

### ToolsCard (shared — used by ConversationWorkspace only)

`ToolsCard` renders `ToolTrace[]` as a vertical timeline rail with expandable `input`/`result` detail. It is **not used in TaskWorkspace**; tool events surface through `ProcessTab` instead. Retained as a shared component for `ConversationWorkspace`.

### ConversationWorkspace (legacy `/c` route consolidation)

The former `workbench-workspace.tsx` container for `/c/[conversationId]` is **consolidated** into a thin `ConversationWorkspace` component co-located in `workbench-shell.tsx`. It renders `PlanCard` + `ToolsCard` only (no tab switcher, no deliverables, no synthesized artifacts). It is not maintained as an independent feature path; it exists solely to preserve the legacy `/c` route while TaskWorkspace is the primary surface.

## ProjectWorkspace

Displays project-level context: materials, tasks, artifacts, and settings. Uses `ArtifactsCard` (a shared workspace component) plus project-specific cards.

### Layout

```
+-----------------------------------+
| [icon] Project Space              |
|-----------------------------------|
|  Materials                        |
|  [file 1]  file  2.3 MB          |
|  [connector]  Google Drive        |
|  --------------------------------|
|  Tasks                            |
|  (dot) task 1                     |
|  (dot) task 2                     |
|  --------------------------------|
|  Artifacts                        |
|  [artifact card] [artifact card]  |
|  --------------------------------|
|  Project Settings                 |
|  Name: [...]                      |
|  Description: [...]               |
|  Connectors: [...]                |
+-----------------------------------+
```

### Data blobs

| Collection | Source | Responsibility |
|-----------|--------|----------------|
| `materials[]` | `Project.materials` | Uploaded files and connector-fetched data |
| `tasks[]` | `Project.tasks` | Project task list with status indicators |
| `artifacts[]` | `Project.artifacts` | Consolidated outputs from all project tasks |
| `connectors[]` | `Project.connectors` | External data source integrations |

Structural fields live in **`packages/shared/src/types.ts`** -- parity required.

### Props

```typescript
interface ProjectWorkspaceProps {
  locale: AshLocale;
  project: Project;
}
```

### Section cards

| Card | Component | Content |
|------|-----------|---------|
| **Materials** | `MaterialsCard` | `ProjectMaterial[]` -- file name, kind (`file` / `connector`), size, addedAt. Upload/delete actions. |
| **Tasks** | `ProjectTasksCard` | `Task[]` -- title, status dot (same indicators as Sidebar), navigates to `/app/task/[taskId]`. New Task action. |
| **Artifacts** | `ArtifactsCard` | `Artifact[]` -- shared workspace component; consolidated outputs from all project tasks. |
| **Project Settings** | `ProjectSettingsCard` | Name, description, connector configuration. Editable fields. |

Sections are wrapped in a `ScrollArea` with `space-y-4 p-4` padding. `<Separator />` dividers between cards are removed; the card shell border (`border border-border`) provides sufficient surface separation without a redundant rule (SPACE-5, PRIN-2). All four project cards (`MaterialsCard`, `ProjectTasksCard`, `ArtifactsCard`, `ProjectSettingsCard`) share the `rounded-lg border border-border bg-card p-3` shell; note that `ProjectSettingsCard` additionally contains an inner `space-y-2` container which is internal to the card and not part of the shared shell.

**Deferred to sub-project A:** real deliverable preview/download (replacing the placeholder stub action), and connector-fetched material preview.

## Shared conventions

### Collapsing behavior

Collapsing the Workspace entirely yields a floating re-open control (FAB) so the Chat pane never orphans the auditing story. Collapse state is managed by the workbench chrome (`WorkbenchChrome`) via `WorkspaceCollapseProps`.

### Vertical card stacking

Both workspace variants use vertical stacked cards within a scrollable area. `TaskWorkspace` uses tabs; the active tab ids are `process` and `deliverables` (panel ids `panel-process` / `panel-deliverables`). `ProjectWorkspace` uses vertical stacked cards with no tab switcher.

### Status pigments (badges)

Status indicators follow the same palette as the Sidebar:

Use the `StatusDot` primitive (do not hand-roll dots) with semantic tokens:

| Status | `StatusDot` variant | Token |
|--------|---------------------|-------|
| `success` / `completed` | `success` | `bg-status-success` |
| `running` | `running` | `bg-status-running animate-pulse` |
| `error` / `failed` | `error` | `bg-destructive` |

### Tool traces timeline orientation

Chosen default: **oldest top, newest bottom** (mirrors conversational reading). Changing orientation requires documenting rationale + migrating fixtures.

## GSAP animations

Workspace collapse/expand uses GSAP via `xPercent` slide animation. All animations honor `prefers-reduced-motion` via `gsap.matchMedia()`.

## Data sourcing

In Phase 1, data flows from `@ash/shared` mocks via server-side fetchers. Future API ingestion swaps adapter internals only -- payloads described here remain contract unless ADR adjusts.

### Live task runs (ADR-0011)

For a Task started in-session, `TaskWorkspace` renders the **live** `Task` from `TaskRunProvider`, not a server mock. The `Task` is produced by folding the praxis **0.4.0 `StreamEvent`** block stream through `runtimeEventReducer` (ADR-0018):

- `messages[]` accumulate in chronological order; `processEvents()` derives `ProcessEvent[]` from them at render time — no separate `toolTraces[]` field is consumed by `TaskWorkspace` directly.
- `deliverables[]` are projected from `source: agent_generated` `Attachment`s on history messages. Praxis carries no `task_outputs` event today; the former synthesized `.pptx` placeholder (`synthesizePptArtifact`) is **retired**. `deliverables[]` is empty for tasks with no `agent_generated` attachments. Because attachments arrive only via `/history` (not the live stream), the provider runs a status-preserving `/history` catch-up after a run completes and on terminal cold-load — see the Deliverables-tab section.

## Future extensions

Feature packs (`office`, `media`, ...): mount inside Workspace chrome via `featureRegistry` metadata -- altering rail count still banned without superseding ADR.
