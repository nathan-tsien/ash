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
|  [tool 1]  success  1.2s         |
|  [tool 2]  running  ...          |
+-----------------------------------+
```

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

### ArtifactsCard

Renders `Artifact[]` from the active Task. Each artifact displays `title`, `preview`, `kind`, and `updatedAt`. Interactions per `kind`:

| `kind` | Behavior |
|--------|----------|
| `document` | Stub open action toast |
| `code` | Read-only monospace preview expansion |
| `image` | Placeholder chrome |
| `link` | `https?` navigates `_blank`; else copy fallback |

### ToolsCard

Renders `ToolTrace[]` from the active Task. Orientation: **oldest top, newest bottom** (mirrors conversational reading). Changing orientation requires documenting rationale + migrating fixtures.

| `status` | Palette guidance |
|----------|------------------|
| `success` | Subtle emerald-muted |
| `running` | Spinner / pulse occupying secondary text |
| `error` | Destructive token |

Each trace row displays `toolName`, `summary`, `status`, and optional `durationMs`.

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

Sections are separated by `<Separator />` components and wrapped in a `ScrollArea` with `space-y-4 p-4` padding.

## Shared conventions

### Collapsing behavior

Collapsing the Workspace entirely yields a floating re-open control (FAB) so the Chat pane never orphans the auditing story. Collapse state is managed by the workbench chrome (`WorkbenchChrome`) via `WorkspaceCollapseProps`.

### Vertical card stacking

Both workspace variants use vertical stacked cards within a scrollable area. Optional tabs (`plan|tools|artifacts`) are permissible -- if adopted, annotate actual tab ids here to avoid ambiguity.

### Status pigments (badges)

Status indicators follow the same palette as the Sidebar:

| Status | Token |
|--------|-------|
| `success` / `completed` | Emerald-muted (`bg-emerald-500` for dots) |
| `running` | Blue pulse (`bg-blue-500 animate-pulse`) |
| `error` / `failed` | Destructive token (`bg-destructive`) |

### Tool traces timeline orientation

Chosen default: **oldest top, newest bottom** (mirrors conversational reading). Changing orientation requires documenting rationale + migrating fixtures.

## GSAP animations

Workspace collapse/expand uses GSAP via `xPercent` slide animation. All animations honor `prefers-reduced-motion` via `gsap.matchMedia()`.

## Data sourcing

In Phase 1, data flows from `@ash/shared` mocks via server-side fetchers. Future API ingestion swaps adapter internals only -- payloads described here remain contract unless ADR adjusts.

## Future extensions

Feature packs (`office`, `media`, ...): mount inside Workspace chrome via `featureRegistry` metadata -- altering rail count still banned without superseding ADR.
