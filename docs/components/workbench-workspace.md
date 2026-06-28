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

**Shared card shell.** Every section card inside both workspace variants uses a single shared surface: `rounded-lg border border-border bg-card p-3`. Section cards do not use `<Separator>` between them; vertical rhythm comes from `space-y-3` / `gap-3` in the scroll container (SPACE-5, PRIN-2). Card headers use a `StatusChip` (from `packages/ui`) to surface compact progress or count summaries (IMPL-7).

## TaskWorkspace

Displays artifacts and execution details for a single Task. Reuses existing `ArtifactsCard` and `ToolsCard` components.

### Layout

```
+-----------------------------------+
| [icon] Workspace                  |
|-----------------------------------|
|  Artifacts                        |
|  [artifact card] [artifact card]  |
|  --------------------------------|
|  Tool Traces                      |
|  | (o) tool_1        1200 ms     |
|  |     summary line              |
|  | (o) tool_2                    |
|  |     summary line              |
+-----------------------------------+
```

The `(o)` glyph is a `StatusDot` hung on a vertical timeline rail (`border-l`).

### Data blobs

| Collection | Source | Responsibility |
|-----------|--------|----------------|
| `artifacts[]` | `Task.artifacts` | Cards summarizing textual/code/image/link payloads |
| `toolTraces[]` | `Task.toolTraces` | Chronological tool summaries + durations |

Structural fields live in **`packages/shared/src/types.ts`** -- parity required.

### Props

```typescript
interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
}
```

### PlanCard

Renders `PlanStep[]` from the active Task as an ordered checklist within the shared card shell
(`rounded-lg border border-border bg-card p-3`). The card header shows a `StatusChip` (IMPL-7)
summarizing plan progress: `running` variant while any step is running, `success` variant once all
steps are done, `neutral` otherwise — with the fraction `done/total` as content. The running step
carries a 2px left accent rail (`border-l-2 border-primary`, `-ml-[2px]` optical alignment, SPACE-1
documented) to visually track in-progress work against the stepped list.

**Deferred to sub-project A:** plan timeline/playback controls (step-by-step history scrubbing,
re-run from step) remain out of scope for this phase.

### ArtifactsCard

Renders `Artifact[]` from the active Task. Each artifact displays `title`, `preview`, `kind`, and `updatedAt`. The card header shows a `StatusChip` (IMPL-7) with the artifact count. Interactions per `kind`:

| `kind` | Behavior |
|--------|----------|
| `document` | Stub open action toast |
| `code` | Read-only monospace preview expansion |
| `image` | Placeholder chrome |
| `link` | `https?` navigates `_blank`; else copy fallback |

### ToolsCard

Renders `ToolTrace[]` from the active Task as a **vertical timeline rail**: a
single `border-l border-border` hairline runs through the dot column, and each
row hangs a `StatusDot` node on the rail (`-2px` optical alignment, matching
`plan-card.tsx`). Orientation: **oldest top, newest bottom** (mirrors
conversational reading). Changing orientation requires documenting rationale +
migrating fixtures.

One status language only — the rail dot — replacing the prior dot + badge +
spinner trio. The dot maps domain status to the `StatusDot` visual variant:

| `ToolTrace.status` | `StatusDot` variant | Token |
|--------------------|---------------------|-------|
| `success` | `success` | `bg-status-success` |
| `running` | `running` | `bg-status-running` + `animate-pulse` |
| `error` | `error` | `bg-destructive` |

Each row is two lines:

- Line 1: mono tool chip (`<code>` `text-caption font-mono`) + right-aligned
  `durationMs` (`text-caption tabular-nums text-muted-foreground`), shown only
  when `durationMs` is defined.
- Line 2: `summary` (`text-body-sm text-muted-foreground`).

**Expandable detail.** When a trace carries optional `input` and/or `result`
fields (added to the shared `ToolTrace` contract by the chat/SSE seam), the row
renders a disclosure toggle. Expanding reveals the present field(s) in a mono
`<pre>` block under `输入` / `结果` (Input / Result) labels. The toggle and
labels are localized (`toolExpand` / `toolCollapse` / `toolInput` /
`toolResult`). Rows without detail render no toggle.

## ProjectWorkspace

Displays project-level context: materials, tasks, artifacts, and settings. Reuses `ArtifactsCard` from TaskWorkspace, plus project-specific cards.

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
| **Artifacts** | `ArtifactsCard` | `Artifact[]` -- same rendering as TaskWorkspace ArtifactsCard. Consolidated from all project tasks. |
| **Project Settings** | `ProjectSettingsCard` | Name, description, connector configuration. Editable fields. |

Sections are wrapped in a `ScrollArea` with `space-y-3 p-3` padding. `<Separator />` dividers between cards are removed; the card shell border (`border border-border`) provides sufficient surface separation without a redundant rule (SPACE-5, PRIN-2).

**Deferred to sub-project A:** real deliverable preview/download (replacing the placeholder stub action), and connector-fetched material preview.

## Shared conventions

### Collapsing behavior

Collapsing the Workspace entirely yields a floating re-open control (FAB) so the Chat pane never orphans the auditing story. Collapse state is managed by the workbench chrome (`WorkbenchChrome`) via `WorkspaceCollapseProps`.

### Vertical card stacking

Both workspace variants use vertical stacked cards within a scrollable area. Optional tabs (`plan|tools|artifacts`) are permissible -- if adopted, annotate actual tab ids here to avoid ambiguity.

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

For a Task started in-session, `TaskWorkspace` renders the **live** `Task` from `TaskRunProvider`, not a server mock. The `Task` is produced by folding the praxis **0.3.0 `StreamEvent`** block stream through `runtimeEventReducer` (ADR-0018):

- `toolTraces[]` are **derived from the message blocks** (`tracesFromBlocks`): a `tool_use` block opens a running trace keyed by `callId`, and the matching `tool_result` block (correlated by `callId`, possibly in a later message) resolves it to `success`/`error` with result detail. Scanning blocks makes the result's message-framing irrelevant and dedupes by `callId`, so a `/history` re-attach cannot duplicate a row. (`durationMs` is not computed in this slice — praxis carries no per-call timing yet.)
- `artifacts[]` -- praxis emits no artifact event today (its `task_outputs` is deferred), so the reducer **synthesizes a placeholder `.pptx` `document` artifact** on terminal `stream_end{task_status: "completed"}`. This is a provisional seam (`TODO(ash)`), replaced by a real mapping when praxis ships outputs. Label it as a mock-equivalent per the Forbidden rule above.

## Future extensions

Feature packs (`office`, `media`, ...): mount inside Workspace chrome via `featureRegistry` metadata -- altering rail count still banned without superseding ADR.
