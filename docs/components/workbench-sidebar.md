# Workbench Sidebar -- left inventory rail

Purpose: dual-section inventory of **Tasks** and **Projects** plus durable global affordances (**new task**, **search**, **command palette**, **account**, **settings**) without absorbing workspace responsibilities.

Forbidden: duplicating Workspace responsibilities (artifacts, tool traces, materials belong in the right rail).

## View modes

The sidebar operates in two structural modes controlled by `WorkbenchViewMode`:

| Mode | Trigger | Layout |
|------|---------|--------|
| `home` / `task` | No project selected, or a standalone Task is active | Dual-section: **Tasks** + **Projects** with section headers |
| `project` | A Project is active (`/app/project/[projectId]`) | **ProjectNav**: back arrow, project name header, project-internal task list |

Switching to `project` mode replaces the dual-section layout entirely with `ProjectNav`. The back arrow navigates to `/app` (workbench home).

## Dual-section layout (home / task mode)

```
+------------------------------+
|  Logo            [collapse]  |
|  [New Task pill]             |
|  [Search input        ⌘K]   |
|------------------------------|
|  -- TASKS ----------- [+] -- |
|  task 1   (dot)  relative   |
|  task 2   (dot)  time       |
|  ...                         |
|------------------------------|
|  -- PROJECTS -------- [+] -- |
|  project 1    folder  3 ran |
|  project 2    folder  1 ran |
|  ...                         |
|------------------------------|
|  User avatar + name          |
|  Settings gear               |
+------------------------------+
```

## Row contracts

### Task list item (`Task`)

Display fields from `Task` in `@ash/shared/src/types.ts` -- update both code and docs when payloads shift.

| Field | Visual treatment |
|-------|------------------|
| `title` | Primary line, `text-body-sm`, truncated. `font-medium` by default, `font-semibold` when the row is active |
| `status` | Status indicator on line 2 (see Status indicators below) |

Line 2 carries **status only** — there is no relative-time string. `Task.updatedAt` from a
`summaryToTask` projection is a synthetic per-fetch stamp (identical on every card; see
`lib/praxis/summary-projection.ts`), so rendering it as relative time was uniform and misleading.
Status is the meaningful secondary signal until praxis adds `updated_at` to the `TaskSummary`
contract (contract-first: extend the OpenAPI schema + regenerate, never hand-edit `generated.ts`).

Selecting a task row navigates to `/app/task/[taskId]`. The **active row** is marked by a 2px
left accent rail `border-l-2 border-sidebar-rail` plus `bg-sidebar-accent`, a `font-semibold`
title, and `aria-current="page"`. Hover (`hover:bg-sidebar-accent/60`) is deliberately weaker so
the selected row clearly outranks it (PRIN-4). Rows have a consistent `min-h-12`.

### Project list item (`Project`)

| Field | Visual treatment |
|-------|------------------|
| `name` | Primary line, `text-body-sm font-medium`, truncated, preceded by `Folder` icon |
| task summary | Computed: running task count (if > 0) + completed task count, `text-caption text-muted-foreground` |

Selecting a project row navigates to `/app/project/[projectId]`. Active project uses the same
accent-rail treatment as task rows.

## Deterministic ordering

Both the dual-section Tasks list and `ProjectNav` sort with a single shared comparator,
`taskStatusSortRank` (`lib/task-status.ts`), so the list never looks shuffled (PRIN-1). Bucket
priority (lower sorts first):

| Rank | Status | Rationale |
|------|--------|-----------|
| 0 | `awaiting_input` | Needs the user now |
| 1 | `running` | Live work |
| 2 | `pending` | Queued |
| 3 | `failed` | Stays visible above the done pile |
| 4 | `completed` | Finished |

The sort is **stable** and runs on a copied array, so the server's LIFO (most-recent-first) order is
preserved within each bucket. The `.slice(0, 10)` cap is applied **after** sorting.

## Status indicators

Status is carried by COLOR-3 token triplets only — no raw palette literals (COLOR-2). Live work
(`running`) pulses via the shared `StatusDot` primitive (`size-2`, `animate-pulse`); every settled
status reads as a calm soft chip (`text-label font-medium`, `rounded-md px-1.5 py-0.5`):

| Status | Visual |
|--------|--------|
| `running` | `StatusDot status="running"` (`bg-status-running`, `animate-pulse`) + label in `text-status-running-foreground` |
| `awaiting_input` | Chip `bg-status-warning-soft text-status-warning-foreground` (attention, not error) |
| `completed` | Chip `bg-status-success-soft text-status-success-foreground` |
| `failed` | Chip `bg-destructive/10 text-destructive` |
| `pending` / idle | Chip `bg-muted text-muted-foreground` |

The live dot + label sit in a flex row (`gap-2`). Status helpers (`taskStatusIsLive`,
`taskStatusChipClass`, `taskStatusDotVariant`, `taskStatusLabelKey`) live in `lib/task-status.ts`
app-side so `packages/ui` never imports domain types. `ProjectNav` rows keep the inline
`StatusDot` + title layout (the dot is the sole status carrier there).

## List limits

Each section displays at most **10 items** (`.slice(0, 10)`) — the most recent slice of the
server-backed list. The Tasks section also renders a **"view all" link** (`viewAllTasks` i18n key)
to `/app/tasks`, the full paginated task list (cursor-based "load more"; empty/error/loading states).
For ad-hoc lookup users can still use the search box or Command Palette (`Cmd+K`).

## Section headers

Each section header displays an uppercase label (`text-xs font-medium uppercase tracking-wider text-muted-foreground`) and a `[+]` button:

| Section | `[+]` action |
|---------|--------------|
| **Tasks** | Triggers new Task creation (navigates to `/app` with Chat input ready) |
| **Projects** | Opens Project creation dialog |

The `[+]` button uses `variant="ghost" size="icon" className="size-6"` with `Plus` icon (`size-3.5`).

## Project-internal navigation (ProjectNav)

When `viewMode === "project"` and an `activeProject` is resolved, the sidebar renders `ProjectNav` instead of the dual-section layout:

```
+------------------------------+
|  [<- Back]  Project Name     |
|------------------------------|
|  -- PROJECT TASKS ---- [+] --|
|  (dot) task 1                |
|  (dot) task 2                |
|  ...                         |
+------------------------------+
```

| Element | Behavior |
|---------|----------|
| Back arrow | `<Link href="/app">`, returns to dual-section layout |
| Project name | Truncated `text-body-sm font-semibold` |
| Task list | Inline status dot + title layout, deterministic `taskStatusSortRank` order, active accent-rail treatment; navigates to `/app/task/[taskId]` |
| `[+]` button | Creates a new Task within the project |

## Search

Unified search box filters both Tasks and Projects by title/name (case-insensitive substring, `~200ms` debounce). Empty results display `emptySearch` i18n string. Placeholder: `searchPlaceholder` (zh-CN).

The command palette trigger is folded into this one row as a trailing `⌘K` kbd-styled button (right-aligned inside the field, `aria-label` `commandPaletteAria`, tooltip `commandPaletteTooltip`): typing filters the inventory locally, clicking the kbd opens the global palette. This collapses the former three-control stack (new-task / standalone palette button / search) to two without losing discoverability (PRIN-2). The `Meta+K` / `Ctrl+K` shortcut is unchanged.

Search filters are applied via `useMemo` on `sidebarQuery` state:

- `filteredTasks`: `task.title.toLowerCase().includes(q)`
- `filteredProjects`: `project.name.toLowerCase().includes(q)`

## Header chrome

- **Logo link**: `Sparkles` icon in a `size-10` rounded button, navigates to `/` (marketing). Visible in both expanded and collapsed states.
- **Brand label**: `text-body-sm font-semibold`, renders the `Wordmark` component from `@ash/ui` — the "ash." brand mark with ember-tinted period. Intentionally untranslated brand mark, not i18n copy (COLOR-10).
- **Collapse button**: `ChevronLeft` icon, collapses sidebar to 56px rail. `aria-expanded={true}`, `aria-controls` targets the sidebar list container.

## Collapsed rail

When collapsed (56px width), the sidebar shows icon-only buttons vertically:

| Icon | Action |
|------|--------|
| `Plus` | New task (`<Link href="/">`) |
| `Settings` | Opens settings modal via `useSettingsModal().openSettings("account")` |
| `ChevronRight` | Expands sidebar back to 260px |

All icon buttons use `variant="ghost" size="icon" className="size-10 rounded-xl"` with `Tooltip` wrappers (zh-CN copy).

## Bottom bar (FooterAccount)

Displays user avatar fallback + display name from `UserProfile`. Settings icon opens the settings modal. Rendered below the `ScrollArea` in expanded mode.

## GSAP animations

Sidebar collapse/expand uses GSAP timelines (not CSS transitions):

- **Collapse**: expanded content fades out (`fadeOut`), aside width animates to 56px (`power3.out`), collapsed rail fades in (`fadeIn`).
- **Expand**: collapsed rail fades out (`fadeOut`), aside width animates to 260px (`power2.out`), expanded content fades in (`fadeIn`).

All animations honor `prefers-reduced-motion` via `gsap.matchMedia()`.

## Keyboard affordances

| Shortcut | Intent |
|----------|--------|
| `Meta+K` / `Ctrl+K` | Open command palette |
| `Tab` / `Shift+Tab` | Traverse sidebar controls |
| `Enter` / `Space` | Activate focused item |

Focus management: after collapse/expand toggle, focus is programmatically restored to the opposite toggle button via `useEffect` + refs (`lastToggleRef`).

## Data sourcing

Props flow from `WorkbenchSidebarProps`:

```typescript
interface WorkbenchSidebarProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
  activeTaskId?: string;
  activeProjectId?: string;
  viewMode: WorkbenchViewMode;
}
```

Tasks are now sourced from praxis: `server/tasks.ts` `listTasks(locale)` calls `GET /v1/tasks`
(server-to-server, direct) and projects each `TaskSummary` to a card `Task` via `summaryToTask`
(see ADR-0016). Projects still come from `@ash/shared` mocks pending Phase 2. Future ingestion swaps
adapter internals only — the `WorkbenchSidebarProps` shape is unchanged.

The SSR list is a seed only. `WorkbenchApp` refreshes it on mount via `useTaskList`
(`components/workbench/use-task-list.ts`), which calls the browser client's `listTasks` through the
BFF and replaces the seed with the result. This is why the list auto-refreshes on entering the
workbench, and it recovers the case where the SSR loader returned empty because its access token had
expired (the server client is read-only; the BFF refreshes the token). On fetch failure the SSR seed
is kept rather than blanked.
