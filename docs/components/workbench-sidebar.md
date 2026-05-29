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
|  Logo            [Cmd+K]     |
|  [New Task pill]             |
|  [Command palette button]    |
|  [Search input]              |
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
| `title` | Primary line, `text-[13px] font-medium`, truncated |
| `status` | Status dot (see below) |
| `updatedAt` | Relative time via `formatRelativeTime` (zh-CN) |

Selecting a task row navigates to `/app/task/[taskId]`. Active task uses `bg-sidebar-accent` highlight.

### Project list item (`Project`)

| Field | Visual treatment |
|-------|------------------|
| `name` | Primary line, `text-[13px] font-medium`, truncated, preceded by `Folder` icon |
| task summary | Computed: running task count (if > 0) + completed task count, `text-[11px] text-muted-foreground` |

Selecting a project row navigates to `/app/project/[projectId]`. Active project uses `bg-sidebar-accent` highlight.

## Status indicators

| Status | Visual |
|--------|--------|
| `running` | `size-1.5` dot, `bg-blue-500`, `animate-pulse` |
| `completed` | `size-1.5` dot, `bg-emerald-500` |
| `failed` | `size-1.5` dot, `bg-destructive` |
| `pending` / idle | `size-1.5` dot, `bg-muted-foreground/40` |

Status dot is paired with the relative time string in a flex row (`gap-2`).

## List limits

Each section displays at most **10 items** (`.slice(0, 10)`). For the full list, users rely on the search box or Command Palette (`Cmd+K`).

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
| Project name | Truncated `text-[13px] font-semibold` |
| Task list | Same status dot + title layout as TaskSection, but navigates to `/app/task/[taskId]` |
| `[+]` button | Creates a new Task within the project |

## Search

Unified search box filters both Tasks and Projects by title/name (case-insensitive substring, `~200ms` debounce). Empty results display `emptySearch` i18n string. Placeholder: `searchPlaceholder` (zh-CN).

Search filters are applied via `useMemo` on `sidebarQuery` state:

- `filteredTasks`: `task.title.toLowerCase().includes(q)`
- `filteredProjects`: `project.name.toLowerCase().includes(q)`

## Header chrome

- **Logo link**: `Sparkles` icon in a `size-10` rounded button, navigates to `/` (marketing). Visible in both expanded and collapsed states.
- **Brand label**: `text-[13px] font-semibold`, displays `sidebarBrand` i18n string.
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

In Phase 1, data comes from `@ash/shared` mocks via server-side fetchers. Future API ingestion swaps adapter internals only.
