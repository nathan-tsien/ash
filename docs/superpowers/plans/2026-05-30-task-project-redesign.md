# Task/Project Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Refactor ash from a Conversation-centered model to a Task/Project-centered model, with new routing (`/app/task/[id]`, `/app/project/[id]`), dual-section Sidebar, Task view, Project view, and default workbench state.

**Architecture:** New `(app)` route group under `[locale]` houses the workbench. Sidebar splits into Tasks and Projects sections with `[+]` creation buttons. Task view reuses existing Chat + new TaskWorkspace. Project view adds ProjectWorkspace with Materials/Tasks/Artifacts/Settings sections. Old `/c/[conversationId]` route is preserved for backward compatibility but not linked from new UI.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS, GSAP, shadcn/ui primitives (`@ash/ui`), `next-intl`, `@ash/shared` types + mocks.

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `packages/shared/src/types.ts` | Add `Task`, `Project`, `TaskStatus`, `ProjectStatus` types |
| `packages/shared/src/mocks/tasks.ts` | Mock Task data |
| `packages/shared/src/mocks/projects.ts` | Mock Project data |
| `apps/web/src/app/[locale]/(app)/layout.tsx` | App route group layout (wraps with providers) |
| `apps/web/src/app/[locale]/(app)/app/page.tsx` | Workbench home page |
| `apps/web/src/app/[locale]/(app)/app/task/[taskId]/page.tsx` | Task detail page |
| `apps/web/src/app/[locale]/(app)/app/project/[projectId]/page.tsx` | Project detail page |
| `apps/web/src/server/tasks.ts` | Server-side Task data fetching |
| `apps/web/src/server/projects.ts` | Server-side Project data fetching |
| `apps/web/src/components/workbench/sidebar/task-section.tsx` | Tasks section in Sidebar |
| `apps/web/src/components/workbench/sidebar/project-section.tsx` | Projects section in Sidebar |
| `apps/web/src/components/workbench/sidebar/project-nav.tsx` | Project-internal sidebar navigation |
| `apps/web/src/components/workbench/workspace/task-workspace.tsx` | Workspace for Task view |
| `apps/web/src/components/workbench/workspace/project-workspace.tsx` | Workspace for Project view |
| `apps/web/src/components/workbench/workspace/materials-card.tsx` | Materials section card |
| `apps/web/src/components/workbench/workspace/project-tasks-card.tsx` | Project tasks section card |
| `apps/web/src/components/workbench/workspace/project-settings-card.tsx` | Project settings section card |
| `apps/web/src/components/workbench/workbench-home.tsx` | Default workbench state (no task/project selected) |
| `apps/web/src/components/workbench/task-creation-input.tsx` | Task creation input component |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add Task/Project types |
| `packages/shared/src/mocks/index.ts` | Export new mocks |
| `packages/shared/src/index.ts` | Export new types if needed |
| `apps/web/src/components/workbench/workbench-types.ts` | New props for task/project views |
| `apps/web/src/components/workbench/workbench-chrome.tsx` | Support task/project mode, new sidebar |
| `apps/web/src/components/workbench/workbench-shell.tsx` | Support task/project mode |
| `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx` | Dual-section layout |
| `apps/web/src/components/workbench/sidebar/sidebar-row.tsx` | Support task row type |
| `apps/web/src/components/workbench/chat/workbench-chat.tsx` | Accept task messages |
| `apps/web/src/lib/workbench-href.ts` | New href helpers |
| `apps/web/src/components/command-palette/command-palette.tsx` | Add task/project search commands |
| `apps/web/messages/zh.json` | New i18n keys |
| `apps/web/messages/en.json` | New i18n keys |
| `docs/components/workbench-sidebar.md` | Update component doc |
| `docs/components/workbench-workspace.md` | Update component doc |

---

## Task 1: Add Task and Project types to packages/shared

**Files:**
- Modify: `packages/shared/src/types.ts`

- [x] **Step 1: Add Task types**

```typescript
// Add after the existing Artifact interface (line 53)

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  projectId?: string; // undefined for independent tasks
  messages: Message[];
  artifacts: Artifact[];
  toolTraces: ToolTrace[];
}
```

- [x] **Step 2: Add Project types**

```typescript
// Add after the Task interface

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export interface ProjectMaterial {
  id: string;
  name: string;
  kind: "file" | "connector";
  size?: string;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  materials: ProjectMaterial[];
  tasks: Task[];
  artifacts: Artifact[];
  connectors: Connector[];
}
```

- [x] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (new types are additive, no breaking changes)

- [x] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(shared): add Task and Project types"
```

---

## Task 2: Add mock data for Tasks and Projects

**Files:**
- Create: `packages/shared/src/mocks/tasks.ts`
- Create: `packages/shared/src/mocks/projects.ts`
- Modify: `packages/shared/src/mocks/index.ts`

- [x] **Step 1: Create mock Tasks**

```typescript
// packages/shared/src/mocks/tasks.ts
import type { Task } from "../types";

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Remove watermark from image",
    description: "Remove the watermark from the uploaded product photo",
    status: "completed",
    createdAt: "2026-05-30T08:00:00Z",
    updatedAt: "2026-05-30T08:00:12Z",
    completedAt: "2026-05-30T08:00:12Z",
    messages: [
      {
        id: "msg-task-1-1",
        role: "user",
        content: "Help me remove the watermark from this image",
        createdAt: "2026-05-30T08:00:00Z",
      },
      {
        id: "msg-task-1-2",
        role: "assistant",
        content: "I've processed the image and removed the watermark. The result is ready for download.",
        createdAt: "2026-05-30T08:00:12Z",
      },
    ],
    artifacts: [
      {
        id: "art-task-1-1",
        kind: "image",
        title: "Processed image (no watermark)",
        preview: "product-clean.png",
        updatedAt: "2026-05-30T08:00:12Z",
      },
    ],
    toolTraces: [
      {
        id: "trace-task-1-1",
        toolName: "Image Processing",
        summary: "Watermark removal completed",
        status: "success",
        startedAt: "2026-05-30T08:00:01Z",
        durationMs: 11000,
      },
    ],
  },
  {
    id: "task-2",
    title: "Generate PPT from report",
    description: "Create a presentation from the Q2 sales report",
    status: "running",
    createdAt: "2026-05-30T09:30:00Z",
    updatedAt: "2026-05-30T09:30:05Z",
    messages: [
      {
        id: "msg-task-2-1",
        role: "user",
        content: "Generate a PPT from the attached Q2 sales report",
        createdAt: "2026-05-30T09:30:00Z",
      },
      {
        id: "msg-task-2-2",
        role: "assistant",
        content: "Working on it. I'm analyzing the report structure and creating slides...",
        createdAt: "2026-05-30T09:30:05Z",
      },
    ],
    artifacts: [],
    toolTraces: [
      {
        id: "trace-task-2-1",
        toolName: "Document Analysis",
        summary: "Parsing Q2 report structure",
        status: "running",
        startedAt: "2026-05-30T09:30:02Z",
      },
    ],
  },
  {
    id: "task-3",
    title: "Translate document to English",
    description: "Translate the product manual from Chinese to English",
    status: "completed",
    createdAt: "2026-05-29T14:00:00Z",
    updatedAt: "2026-05-29T14:02:30Z",
    completedAt: "2026-05-29T14:02:30Z",
    messages: [
      {
        id: "msg-task-3-1",
        role: "user",
        content: "Translate this product manual to English",
        createdAt: "2026-05-29T14:00:00Z",
      },
      {
        id: "msg-task-3-2",
        role: "assistant",
        content: "Translation complete. The document has been translated with technical terminology preserved.",
        createdAt: "2026-05-29T14:02:30Z",
      },
    ],
    artifacts: [
      {
        id: "art-task-3-1",
        kind: "document",
        title: "Product Manual (English)",
        preview: "manual-en.pdf",
        updatedAt: "2026-05-29T14:02:30Z",
      },
    ],
    toolTraces: [
      {
        id: "trace-task-3-1",
        toolName: "Translation",
        summary: "Chinese to English translation",
        status: "success",
        startedAt: "2026-05-29T14:00:05Z",
        durationMs: 145000,
      },
    ],
  },
];

export function getMockTasks(): Task[] {
  return mockTasks;
}

export function getMockTask(id: string): Task | undefined {
  return mockTasks.find((t) => t.id === id);
}
```

- [x] **Step 2: Create mock Projects**

```typescript
// packages/shared/src/mocks/projects.ts
import type { Project } from "../types";
import { mockTasks } from "./tasks";

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Self-media Vlog Project",
    description: "Create a vlog about self-media entrepreneurship",
    status: "active",
    createdAt: "2026-05-28T10:00:00Z",
    updatedAt: "2026-05-30T09:00:00Z",
    materials: [
      {
        id: "mat-1",
        name: "Competitor Analysis.pdf",
        kind: "file",
        size: "2.4 MB",
        addedAt: "2026-05-28T10:05:00Z",
      },
      {
        id: "mat-2",
        name: "Reference Videos.mp4",
        kind: "file",
        size: "156 MB",
        addedAt: "2026-05-28T10:10:00Z",
      },
      {
        id: "mat-3",
        name: "Industry Data.xlsx",
        kind: "file",
        size: "890 KB",
        addedAt: "2026-05-28T10:15:00Z",
      },
    ],
    tasks: [
      {
        id: "proj1-task-1",
        title: "Collect industry materials",
        description: "Gather data about self-media industry trends",
        status: "completed",
        createdAt: "2026-05-28T11:00:00Z",
        updatedAt: "2026-05-28T11:30:00Z",
        completedAt: "2026-05-28T11:30:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [
          {
            id: "art-proj1-1",
            kind: "document",
            title: "Industry Report",
            preview: "industry-report.pdf",
            updatedAt: "2026-05-28T11:30:00Z",
          },
        ],
        toolTraces: [],
      },
      {
        id: "proj1-task-2",
        title: "Analyze popular topics",
        description: "Identify trending topics in self-media space",
        status: "running",
        createdAt: "2026-05-29T09:00:00Z",
        updatedAt: "2026-05-30T09:00:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
      {
        id: "proj1-task-3",
        title: "Write vlog script",
        description: "Draft the vlog script based on research",
        status: "pending",
        createdAt: "2026-05-30T09:00:00Z",
        updatedAt: "2026-05-30T09:00:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
    ],
    artifacts: [
      {
        id: "art-proj1-1",
        kind: "document",
        title: "Industry Report",
        preview: "industry-report.pdf",
        updatedAt: "2026-05-28T11:30:00Z",
      },
    ],
    connectors: [],
  },
  {
    id: "proj-2",
    name: "Q2 Report",
    description: "Prepare quarterly business review presentation",
    status: "active",
    createdAt: "2026-05-27T08:00:00Z",
    updatedAt: "2026-05-30T07:00:00Z",
    materials: [
      {
        id: "mat-4",
        name: "Q2 Sales Data.xlsx",
        kind: "file",
        size: "1.2 MB",
        addedAt: "2026-05-27T08:10:00Z",
      },
      {
        id: "mat-5",
        name: "Team Notes (Notion)",
        kind: "connector",
        addedAt: "2026-05-27T08:15:00Z",
      },
    ],
    tasks: [
      {
        id: "proj2-task-1",
        title: "Compile sales metrics",
        description: "Extract and summarize Q2 sales data",
        status: "completed",
        createdAt: "2026-05-27T09:00:00Z",
        updatedAt: "2026-05-27T09:45:00Z",
        completedAt: "2026-05-27T09:45:00Z",
        projectId: "proj-2",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
      {
        id: "proj2-task-2",
        title: "Generate presentation",
        description: "Create QBR slide deck from compiled data",
        status: "pending",
        createdAt: "2026-05-30T07:00:00Z",
        updatedAt: "2026-05-30T07:00:00Z",
        projectId: "proj-2",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
    ],
    artifacts: [],
    connectors: [
      {
        id: "conn-1",
        label: "Team Notes",
        provider: "Notion",
        kind: "notes",
        status: "connected",
        description: "Synced from Notion workspace",
        updatedAt: "2026-05-27T08:15:00Z",
      },
    ],
  },
];

export function getMockProjects(): Project[] {
  return mockProjects;
}

export function getMockProject(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}
```

- [x] **Step 3: Export new mocks**

Edit `packages/shared/src/mocks/index.ts` to add:
```typescript
export * from "./tasks";
export * from "./projects";
```

- [x] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/shared/src/mocks/tasks.ts packages/shared/src/mocks/projects.ts packages/shared/src/mocks/index.ts
git commit -m "feat(shared): add Task and Project mock data"
```

---

## Task 3: Add server-side data fetching for Tasks and Projects

**Files:**
- Create: `apps/web/src/server/tasks.ts`
- Create: `apps/web/src/server/projects.ts`

- [x] **Step 1: Create tasks server module**

```typescript
// apps/web/src/server/tasks.ts
import { getMockTask, getMockTasks, type AshLocale } from "@ash/shared";

export async function listTasks(_locale: AshLocale) {
  // Phase 1: return mocks. Phase 2: fetch from praxis API.
  return getMockTasks();
}

export async function getActiveTask(taskId: string, _locale: AshLocale) {
  // Phase 1: return mock. Phase 2: fetch from praxis API.
  return getMockTask(taskId) ?? null;
}
```

- [x] **Step 2: Create projects server module**

```typescript
// apps/web/src/server/projects.ts
import { getMockProject, getMockProjects, type AshLocale } from "@ash/shared";

export async function listProjects(_locale: AshLocale) {
  // Phase 1: return mocks. Phase 2: fetch from praxis API.
  return getMockProjects();
}

export async function getActiveProject(projectId: string, _locale: AshLocale) {
  // Phase 1: return mock. Phase 2: fetch from praxis API.
  return getMockProject(projectId) ?? null;
}
```

- [x] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add apps/web/src/server/tasks.ts apps/web/src/server/projects.ts
git commit -m "feat(web): add server-side Task and Project data fetching"
```

---

## Task 4: Update workbench types and href helpers

**Files:**
- Modify: `apps/web/src/components/workbench/workbench-types.ts`
- Modify: `apps/web/src/lib/workbench-href.ts`

- [x] **Step 1: Update workbench types**

Replace `apps/web/src/components/workbench/workbench-types.ts` with:

```typescript
import type { AshLocale, Conversation, Task, Project } from "@ash/shared";
import type { ReactNode } from "react";

/** View mode determines which entity the workbench is displaying. */
export type WorkbenchViewMode = "task" | "project" | "home";

export interface WorkbenchShellProps {
  locale: AshLocale;
  conversations: Conversation[];
  active: Conversation;
  /** Optional banner rendered above the chat scroll area. */
  chatBanner?: ReactNode;
}

/** Props for the new Task/Project-aware workbench. */
export interface WorkbenchAppProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
  activeTask?: Task;
  activeProject?: Project;
  viewMode: WorkbenchViewMode;
}

/** Chat-facing slice of workspace collapse state. */
export interface WorkspaceToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Chrome-internal superset; adds explicit expand handler used by the floating FAB. */
export interface WorkspaceCollapseProps extends WorkspaceToggleProps {
  onExpand: () => void;
}
```

- [x] **Step 2: Update href helpers**

Replace `apps/web/src/lib/workbench-href.ts` with:

```typescript
import type { Task, Project } from "@ash/shared";

/** Resolve the default workbench entry href. */
export function firstWorkbenchHref(tasks: Task[], projects: Project[]): string {
  if (tasks.length > 0) return `/app/task/${tasks[0].id}`;
  if (projects.length > 0) return `/app/project/${projects[0].id}`;
  return "/app";
}

export function taskHref(taskId: string): string {
  return `/app/task/${taskId}`;
}

export function projectHref(projectId: string): string {
  return `/app/project/${projectId}`;
}
```

- [x] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Some existing files may reference old `WorkbenchShellProps` — fix import paths in Task 5.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/workbench-types.ts apps/web/src/lib/workbench-href.ts
git commit -m "feat(web): update workbench types for Task/Project model"
```

---

## Task 5: Create WorkbenchApp shell component

**Files:**
- Create: `apps/web/src/components/workbench/workbench-app.tsx`
- Create: `apps/web/src/components/workbench/workbench-home.tsx`

- [x] **Step 1: Create WorkbenchApp component**

```typescript
// apps/web/src/components/workbench/workbench-app.tsx
"use client";

import type { WorkbenchAppProps } from "./workbench-types";
import { WorkbenchSidebar } from "./sidebar/workbench-sidebar";
import { WorkbenchChat } from "./chat/workbench-chat";
import { TaskWorkspace } from "./workspace/task-workspace";
import { ProjectWorkspace } from "./workspace/project-workspace";
import { WorkbenchHome } from "./workbench-home";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import { PanelRightOpen } from "lucide-react";
import { Button } from "@ash/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { useTranslations } from "next-intl";

function mapTaskStatus(status: string): "idle" | "running" | "completed" | "failed" {
  switch (status) {
    case "running": return "running";
    case "completed": return "completed";
    case "failed": return "failed";
    default: return "idle";
  }
}

export function WorkbenchApp({
  locale,
  tasks,
  projects,
  activeTask,
  activeProject,
  viewMode,
}: WorkbenchAppProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Workbench");

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  useGSAP(
    () => {
      const ws = workspaceRef.current;
      const fab = fabRef.current;
      if (!ws || !fab) return;

      if (workspaceCollapsed) {
        const tl = gsap.timeline();
        tl.to(ws, { xPercent: 100, ...fadeOut() })
          .from(fab, { scale: 0.8, autoAlpha: 0, duration: 0.2, ease: "power2.out" }, "<0.1");
      } else {
        const tl = gsap.timeline();
        tl.to(fab, fadeOut(0.1))
          .to(ws, { xPercent: 0, ...fadeIn(0.35) }, "<0.05");
      }
    },
    { dependencies: [workspaceCollapsed] },
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <WorkbenchSidebar
        locale={locale}
        tasks={tasks}
        projects={projects}
        activeTaskId={activeTask?.id}
        activeProjectId={activeProject?.id}
        viewMode={viewMode}
      />

      {viewMode === "home" ? (
        <WorkbenchHome locale={locale} tasks={tasks} projects={projects} />
      ) : activeTask ? (
        <WorkbenchChat
          locale={locale}
          active={{
            id: activeTask.id,
            title: activeTask.title,
            preview: activeTask.description,
            updatedAt: activeTask.updatedAt,
            status: mapTaskStatus(activeTask.status),
            messages: activeTask.messages,
            plan: [],
            toolTraces: activeTask.toolTraces,
            artifacts: activeTask.artifacts,
          }}
          workspace={{ collapsed: workspaceCollapsed, onToggle }}
        />
      ) : activeProject ? (
        <WorkbenchChat
          locale={locale}
          active={{
            id: activeProject.id,
            title: activeProject.name,
            preview: activeProject.description,
            updatedAt: activeProject.updatedAt,
            status: activeProject.status === "active" ? "running" : "idle",
            messages: [],
            plan: activeProject.tasks.map((task) => ({
              id: task.id,
              label: task.title,
              status: task.status === "completed" ? "done" as const : task.status === "running" ? "running" as const : task.status === "failed" ? "failed" as const : "pending" as const,
            })),
            toolTraces: [],
            artifacts: activeProject.artifacts,
          }}
          workspace={{ collapsed: workspaceCollapsed, onToggle }}
        />
      ) : null}

      {viewMode !== "home" && (
        <div
          ref={workspaceRef}
          className="flex shrink-0 flex-col"
          style={{ width: 380 }}
        >
          {activeTask ? (
            <TaskWorkspace locale={locale} task={activeTask} />
          ) : activeProject ? (
            <ProjectWorkspace locale={locale} project={activeProject} />
          ) : null}
        </div>
      )}

      {viewMode !== "home" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={fabRef}
              variant="pill"
              size="sm"
              className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
              type="button"
              aria-label={t("expandWorkbenchAria")}
              onClick={onExpand}
              style={{ visibility: workspaceCollapsed ? "visible" : "hidden" }}
            >
              <PanelRightOpen className="size-4" aria-hidden />
              {t("workspaceTitle")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{t("workspaceFabTooltip")}</TooltipContent>
        </Tooltip>
      )}

      <CommandPalette onToggleWorkspace={viewMode !== "home" ? onToggle : undefined} />
    </div>
  );
}
```

- [x] **Step 2: Create WorkbenchHome component**

```typescript
// apps/web/src/components/workbench/workbench-home.tsx
"use client";

import type { AshLocale, Task, Project } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { taskHref, projectHref } from "@/lib/workbench-href";
import { formatRelativeTime } from "@ash/shared";

export interface WorkbenchHomeProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
}

export function WorkbenchHome({ locale, tasks, projects }: WorkbenchHomeProps) {
  const t = useTranslations("Workbench");
  const recentTasks = tasks.slice(0, 6);
  const recentProjects = projects.slice(0, 4);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-16">
          {/* Central input area */}
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
              <Sparkles className="size-7 text-muted-foreground" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold">{t("homeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("homeSubtitle")}</p>
          </div>

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("recentTasks")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={taskHref(task.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatRelativeTime(task.updatedAt, locale)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {recentProjects.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("projects")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={projectHref(project.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.tasks.length} {t("tasksCount")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
```

- [x] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Will fail because Sidebar and Workspace components don't exist yet. Fix in subsequent tasks.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/workbench-app.tsx apps/web/src/components/workbench/workbench-home.tsx
git commit -m "feat(web): add WorkbenchApp shell and home view"
```

---

## Task 6: Add new app route group and pages

**Files:**
- Create: `apps/web/src/app/[locale]/(app)/layout.tsx`
- Create: `apps/web/src/app/[locale]/(app)/app/page.tsx`
- Create: `apps/web/src/app/[locale]/(app)/app/task/[taskId]/page.tsx`
- Create: `apps/web/src/app/[locale]/(app)/app/project/[projectId]/page.tsx`

- [x] **Step 1: Create app layout**

```typescript
// apps/web/src/app/[locale]/(app)/layout.tsx
import type { ReactNode } from "react";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsModalProvider>
      <CommandPaletteProvider>
        {children}
      </CommandPaletteProvider>
    </SettingsModalProvider>
  );
}
```

- [x] **Step 2: Create workbench home page**

```typescript
// apps/web/src/app/[locale]/(app)/app/page.tsx
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AppHomePage({ params }: PageProps) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      viewMode="home"
    />
  );
}
```

- [x] **Step 3: Create task detail page**

```typescript
// apps/web/src/app/[locale]/(app)/app/task/[taskId]/page.tsx
import { notFound } from "next/navigation";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";
import { getActiveTask } from "@/server/tasks";

type PageProps = {
  params: Promise<{ locale: string; taskId: string }>;
};

export default async function TaskPage({ params }: PageProps) {
  const { locale, taskId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const activeTask = await getActiveTask(taskId, ashLocale);

  if (!activeTask) {
    notFound();
  }

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      activeTask={activeTask}
      viewMode="task"
    />
  );
}
```

- [x] **Step 4: Create project detail page**

```typescript
// apps/web/src/app/[locale]/(app)/app/project/[projectId]/page.tsx
import { notFound } from "next/navigation";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";
import { getActiveProject } from "@/server/projects";

type PageProps = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { locale, projectId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const activeProject = await getActiveProject(projectId, ashLocale);

  if (!activeProject) {
    notFound();
  }

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      activeProject={activeProject}
      viewMode="project"
    />
  );
}
```

- [x] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (WorkbenchApp exists from Task 5, pages import it correctly)

- [x] **Step 6: Commit**

```bash
git add apps/web/src/app/\[locale\]/\(app\)/
git commit -m "feat(web): add app route group with task/project pages"
```

---

## Task 7: Redesign Sidebar with dual-section layout

**Files:**
- Modify: `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`
- Modify: `apps/web/src/components/workbench/sidebar/sidebar-row.tsx`
- Create: `apps/web/src/components/workbench/sidebar/task-section.tsx`
- Create: `apps/web/src/components/workbench/sidebar/project-section.tsx`
- Create: `apps/web/src/components/workbench/sidebar/project-nav.tsx`

- [x] **Step 1: Create TaskSection component**

```typescript
// apps/web/src/components/workbench/sidebar/task-section.tsx
"use client";

import type { AshLocale, Task } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { taskHref } from "@/lib/workbench-href";

export interface TaskSectionProps {
  locale: AshLocale;
  tasks: Task[];
  activeTaskId?: string;
  onNewTask?: () => void;
}

export function TaskSection({ locale, tasks, activeTaskId, onNewTask }: TaskSectionProps) {
  const t = useTranslations("Workbench");
  const displayTasks = tasks.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("tasksSection")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onNewTask}
          aria-label={t("newTask")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {displayTasks.map((task) => (
          <li key={task.id}>
            <Link
              href={taskHref(task.id)}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition-colors",
                task.id === activeTaskId
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <p className="truncate text-[13px] font-medium leading-snug">
                {task.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    task.status === "running"
                      ? "animate-pulse bg-blue-500"
                      : task.status === "completed"
                        ? "bg-emerald-500"
                        : task.status === "failed"
                          ? "bg-destructive"
                          : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(task.updatedAt, locale)}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {displayTasks.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyTasks")}
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [x] **Step 2: Create ProjectSection component**

```typescript
// apps/web/src/components/workbench/sidebar/project-section.tsx
"use client";

import type { AshLocale, Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Folder, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { projectHref } from "@/lib/workbench-href";

export interface ProjectSectionProps {
  locale: AshLocale;
  projects: Project[];
  activeProjectId?: string;
  onNewProject?: () => void;
}

export function ProjectSection({ locale, projects, activeProjectId, onNewProject }: ProjectSectionProps) {
  const t = useTranslations("Workbench");
  const displayProjects = projects.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectsSection")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onNewProject}
          aria-label={t("newProject")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {displayProjects.map((project) => {
          const completedTasks = project.tasks.filter((t) => t.status === "completed").length;
          const runningTasks = project.tasks.filter((t) => t.status === "running").length;
          return (
            <li key={project.id}>
              <Link
                href={projectHref(project.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                  project.id === activeProjectId
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-snug">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {runningTasks > 0 && `${runningTasks} ${t("running")} · `}
                    {completedTasks} {t("completed")}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {displayProjects.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyProjects")}
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [x] **Step 3: Create ProjectNav component (project-internal sidebar)**

```typescript
// apps/web/src/components/workbench/sidebar/project-nav.tsx
"use client";

import type { AshLocale, Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export interface ProjectNavProps {
  locale: AshLocale;
  project: Project;
  activeTaskId?: string;
}

export function ProjectNav({ locale, project, activeTaskId }: ProjectNavProps) {
  const t = useTranslations("Workbench");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <Link
          href="/app"
          className="flex size-8 items-center justify-center rounded-lg hover:bg-sidebar-accent"
          aria-label={t("backToHome")}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <p className="truncate text-[13px] font-semibold">{project.name}</p>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectTasks")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={t("newTask")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>

      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {project.tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/app/task/${task.id}`}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition-colors",
                task.id === activeTaskId
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    task.status === "completed"
                      ? "bg-emerald-500"
                      : task.status === "running"
                        ? "animate-pulse bg-blue-500"
                        : task.status === "failed"
                          ? "bg-destructive"
                          : "bg-muted-foreground/40",
                  )}
                />
                <p className="truncate text-[13px] font-medium leading-snug">
                  {task.title}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [x] **Step 4: Rewrite WorkbenchSidebar with dual-section layout**

Replace the content of `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`. Key changes:
- Accept `tasks`, `projects`, `activeTaskId`, `activeProjectId`, `viewMode` props
- When `viewMode === "project"`, render `ProjectNav` instead of TaskSection + ProjectSection
- Keep collapse/expand GSAP animation
- Keep search box (searches both tasks and projects)
- Keep footer account

The full implementation follows the same structure as the current sidebar but replaces the conversation list with TaskSection + ProjectSection. When `viewMode === "project"`, it renders ProjectNav instead.

- [x] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: May have remaining import issues — fix iteratively.

- [x] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/sidebar/
git commit -m "feat(web): redesign Sidebar with Task/Project dual-section layout"
```

---

## Task 8: Create TaskWorkspace and ProjectWorkspace

**Files:**
- Create: `apps/web/src/components/workbench/workspace/task-workspace.tsx`
- Create: `apps/web/src/components/workbench/workspace/project-workspace.tsx`
- Create: `apps/web/src/components/workbench/workspace/materials-card.tsx`
- Create: `apps/web/src/components/workbench/workspace/project-tasks-card.tsx`
- Create: `apps/web/src/components/workbench/workspace/project-settings-card.tsx`

- [x] **Step 1: Create TaskWorkspace**

```typescript
// apps/web/src/components/workbench/workspace/task-workspace.tsx
"use client";

import type { AshLocale, Task } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArtifactsCard } from "./artifacts-card";
import { ToolsCard } from "./tools-card";

export interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
}

export function TaskWorkspace({ locale, task }: TaskWorkspaceProps) {
  const t = useTranslations("Workbench");

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-[13px] font-semibold">{t("workspaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <ArtifactsCard locale={locale} artifacts={task.artifacts} />
          <Separator />
          <ToolsCard traces={task.toolTraces} />
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [x] **Step 2: Create MaterialsCard**

```typescript
// apps/web/src/components/workbench/workspace/materials-card.tsx
"use client";

import type { ProjectMaterial } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { FileText, Database, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MaterialsCardProps {
  materials: ProjectMaterial[];
}

export function MaterialsCard({ materials }: MaterialsCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("materialsTitle")}</h3>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Upload className="size-3.5" aria-hidden />
          {t("upload")}
        </Button>
      </div>
      <ul className="space-y-1.5">
        {materials.map((mat) => (
          <li
            key={mat.id}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent"
          >
            {mat.kind === "connector" ? (
              <Database className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="truncate">{mat.name}</span>
            {mat.size && (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{mat.size}</span>
            )}
          </li>
        ))}
        {materials.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyMaterials")}
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [x] **Step 3: Create ProjectTasksCard**

```typescript
// apps/web/src/components/workbench/workspace/project-tasks-card.tsx
"use client";

import type { Task } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { taskHref } from "@/lib/workbench-href";

export interface ProjectTasksCardProps {
  tasks: Task[];
}

export function ProjectTasksCard({ tasks }: ProjectTasksCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("projectTasksTitle")}</h3>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Plus className="size-3.5" aria-hidden />
          {t("newTask")}
        </Button>
      </div>
      <ul className="space-y-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={taskHref(task.id)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  task.status === "completed"
                    ? "bg-emerald-500"
                    : task.status === "running"
                      ? "animate-pulse bg-blue-500"
                      : task.status === "failed"
                        ? "bg-destructive"
                        : "border border-muted-foreground/40",
                )}
              />
              <span className="truncate">{task.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [x] **Step 4: Create ProjectSettingsCard**

```typescript
// apps/web/src/components/workbench/workspace/project-settings-card.tsx
"use client";

import type { Project } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ProjectSettingsCardProps {
  project: Project;
}

export function ProjectSettingsCard({ project }: ProjectSettingsCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Settings className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{t("projectSettings")}</h3>
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("projectName")}</p>
          <p className="text-sm">{project.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("projectDescription")}</p>
          <p className="text-sm">{project.description}</p>
        </div>
        {project.connectors.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t("connectors")}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {project.connectors.map((conn) => (
                <span
                  key={conn.id}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                >
                  {conn.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 5: Create ProjectWorkspace**

```typescript
// apps/web/src/components/workbench/workspace/project-workspace.tsx
"use client";

import type { AshLocale, Project } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArtifactsCard } from "./artifacts-card";
import { MaterialsCard } from "./materials-card";
import { ProjectTasksCard } from "./project-tasks-card";
import { ProjectSettingsCard } from "./project-settings-card";

export interface ProjectWorkspaceProps {
  locale: AshLocale;
  project: Project;
}

export function ProjectWorkspace({ locale, project }: ProjectWorkspaceProps) {
  const t = useTranslations("Workbench");

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-[13px] font-semibold">{t("projectSpaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <MaterialsCard materials={project.materials} />
          <Separator />
          <ProjectTasksCard tasks={project.tasks} />
          <Separator />
          <ArtifactsCard locale={locale} artifacts={project.artifacts} />
          <Separator />
          <ProjectSettingsCard project={project} />
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [x] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (or fix remaining import issues)

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/workbench/workspace/
git commit -m "feat(web): add TaskWorkspace and ProjectWorkspace components"
```

---

## Task 9: Update i18n translation keys

**Files:**
- Modify: `apps/web/messages/zh.json`
- Modify: `apps/web/messages/en.json`

- [x] **Step 1: Add new keys to zh.json**

Add these keys under the `"Workbench"` namespace:

```json
{
  "Workbench": {
    "tasksSection": "Tasks",
    "projectsSection": "Projects",
    "emptyTasks": "No tasks yet",
    "emptyProjects": "No projects yet",
    "newProject": "New Project",
    "running": "running",
    "completed": "completed",
    "backToHome": "Back to home",
    "projectTasks": "Project Tasks",
    "homeTitle": "Start working",
    "homeSubtitle": "Describe a task or select a project to begin",
    "recentTasks": "Recent Tasks",
    "projects": "Projects",
    "tasksCount": "Tasks",
    "materialsTitle": "Materials",
    "upload": "Upload",
    "emptyMaterials": "No materials yet",
    "projectTasksTitle": "Tasks",
    "projectSettings": "Project Settings",
    "projectName": "Name",
    "projectDescription": "Description",
    "connectors": "Connectors",
    "projectSpaceTitle": "Project Space"
  }
}
```

- [x] **Step 2: Add corresponding keys to en.json**

Add the same keys with English values under the `"Workbench"` namespace.

- [x] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(web): add i18n keys for Task/Project views"
```

---

## Task 10: Update Command Palette with Task/Project search

**Files:**
- Modify: `apps/web/src/components/command-palette/command-palette.tsx`

- [x] **Step 1: Add Task and Project search commands**

Extend the command palette to include:
- "Search Tasks" group — lists tasks, Enter navigates to `/app/task/[id]`
- "Search Projects" group — lists projects, Enter navigates to `/app/project/[id]`
- "New Task" — navigates to `/app` (triggers task creation)
- "New Project" — placeholder for future dialog

- [x] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add apps/web/src/components/command-palette/command-palette.tsx
git commit -m "feat(web): extend Command Palette with Task/Project search"
```

---

## Task 11: Update component docs

**Files:**
- Modify: `docs/components/workbench-sidebar.md`
- Modify: `docs/components/workbench-workspace.md`

- [x] **Step 1: Update sidebar doc**

Rewrite `docs/components/workbench-sidebar.md` to reflect:
- Dual-section layout (Tasks + Projects)
- `[+]` buttons on section headers
- Bottom bar: user info + settings
- Project-internal navigation mode
- Search across tasks and projects

- [x] **Step 2: Update workspace doc**

Rewrite `docs/components/workbench-workspace.md` to reflect:
- TaskWorkspace: Artifacts + Execution details
- ProjectWorkspace: Materials + Tasks + Artifacts + Project Settings
- Existing Plan/Tools/Artifacts card components reused

- [x] **Step 3: Commit**

```bash
git add docs/components/workbench-sidebar.md docs/components/workbench-workspace.md
git commit -m "docs: update Sidebar and Workspace component docs for Task/Project model"
```

---

## Task 12: Integration test and cleanup

- [x] **Step 1: Run full gate**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS

- [x] **Step 2: Manual verification**

1. Visit `/app` — should show workbench home with recent tasks and projects
2. Click a task — should show task view with chat + workspace
3. Click a project — should show project view with sidebar navigation + project workspace
4. Sidebar should show Tasks and Projects sections with `[+]` buttons
5. Cmd+K should search tasks and projects
6. Old `/c/[conversationId]` route should still work (backward compat)

- [x] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: integration fixes for Task/Project redesign"
```
