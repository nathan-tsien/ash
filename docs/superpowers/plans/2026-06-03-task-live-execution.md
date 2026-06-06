# Task Live Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login → type a directive on the workbench home → watch a fake-driven agent run stream (assistant text + tool traces) → a placeholder PPT artifact appears, with the data pipeline shaped to praxis's real OpenAPI contract.

**Architecture:** A client-side execution pipeline isolated behind a `PraxisTaskClient` interface whose shape mirrors the praxis REST + SSE contract. A `fakePraxisClient` emits real-shaped `RuntimeEvent`s; a pure `runtimeEventReducer` folds them into ash's existing `Task` view-model; a `TaskRunProvider` holds session runs and the UI reads live tasks from it. No real network/SSE this slice.

**Tech Stack:** Next.js App Router (client components), TypeScript strict, next-intl (zh/en), vitest, GSAP presets (existing).

**Spec:** `docs/superpowers/specs/2026-06-03-task-live-execution.md`

---

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/web/src/lib/praxis/contract/praxis.yaml` + `schemas.json` | Vendored praxis OpenAPI v0.1.0 (source for type gen) |
| `apps/web/src/lib/praxis/generated.ts` | REST wire types from the OpenAPI (gen output, do not hand-edit) |
| `apps/web/src/lib/praxis/runtime-events.ts` | `RuntimeEvent` union (hand-authored; NOT in OpenAPI — sourced from praxis `praxis-protocol/src/traits.rs` + ADR-0008) |
| `apps/web/src/lib/praxis/client.ts` | `PraxisTaskClient` interface + `getPraxisClient()` factory |
| `apps/web/src/lib/praxis/fake-client.ts` | Local generator emitting real-shaped events (PPT script) |
| `apps/web/src/lib/praxis/http-client.ts` | Real praxis impl, scaffolded + disabled |
| `apps/web/src/lib/praxis/runtime-event-reducer.ts` | Pure `RuntimeEvent` → ash `Task` reducer |
| `apps/web/src/lib/praxis/__tests__/runtime-event-reducer.test.ts` | Reducer unit tests |
| `apps/web/src/components/workbench/task-run-provider.tsx` | Client context: session runs + `startTask` |
| `apps/web/src/components/workbench/workbench-app.tsx` | Merge session runs into sidebar + active task (modify) |
| `apps/web/src/components/workbench/workbench-home.tsx` | Composer triggers `startTask` + navigate (modify) |
| `apps/web/src/components/workbench/workbench-types.ts` | Add `taskId?` to `WorkbenchAppProps` (modify) |
| `apps/web/src/app/[locale]/(app)/layout.tsx` | Wrap with `TaskRunProvider` (modify) |
| `apps/web/src/app/[locale]/(app)/app/task/[taskId]/page.tsx` | Tolerate session-only task; pass `taskId` (modify) |
| `apps/web/messages/{zh,en}.json` | New Workbench strings (modify) |
| `docs/adr/0011-praxis-contract-and-live-task-execution.md` | New ADR |
| `docs/adr/0007-transport-sse-vs-websocket.md` | Proposed → Accepted = SSE (modify) |
| `docs/components/workbench-chat.md` + `workbench-workspace.md` | Running-state behavior (modify) |

---

## Task 1: Vendor praxis contract + wire types

**Files:**
- Create: `apps/web/src/lib/praxis/contract/praxis.yaml`, `apps/web/src/lib/praxis/contract/schemas.json`
- Create: `apps/web/src/lib/praxis/generated.ts`
- Create: `apps/web/src/lib/praxis/runtime-events.ts`
- Modify: `apps/web/package.json` (devDep `openapi-typescript` + `gen:praxis` script)

- [ ] **Step 1:** Copy the two vendored files from `/tmp/praxis.yaml` and `/tmp/praxis-schemas.json` into `contract/`. These are the authoritative wire contract.

- [ ] **Step 2:** Add to `apps/web/package.json` scripts: `"gen:praxis": "openapi-typescript src/lib/praxis/contract/praxis.yaml -o src/lib/praxis/generated.ts"`, and devDep `"openapi-typescript": "^7"`. Run `pnpm --filter @ash/web install` then `pnpm --filter @ash/web gen:praxis`. If the install/gen fails offline, hand-author `generated.ts` to mirror `schemas.json` exactly (header: `// Generated-equivalent: mirror of praxis openapi/schemas.json @ v0.1.0. Regenerate via pnpm --filter @ash/web gen:praxis`).

- [ ] **Step 3:** Author `runtime-events.ts` (RuntimeEvent is documented in praxis ADR-0008 + defined in `praxis-protocol/src/traits.rs`; it is NOT in the OpenAPI, so it is hand-authored here):

```ts
// praxis RuntimeEvent wire types. SOURCE OF TRUTH: nathan-tsien/praxis
// crates/praxis-protocol/src/traits.rs (enum RuntimeEvent, #[serde(tag="type",
// rename_all="snake_case")]) + ADR-0008. RuntimeEvent is not expressed in the
// OpenAPI document (the /events response is typed `string`), so it is mirrored
// here by hand. Keep in sync when praxis revises the contract.

export type RuntimeEvent =
  | { type: "turn_started" }
  | { type: "turn_paused" }
  | { type: "turn_resumed" }
  | { type: "turn_cancelled" }
  | { type: "turn_completed" }
  | { type: "turn_failed"; reason: string }
  | { type: "text_delta"; chunk: string }
  | { type: "thinking_delta"; chunk: string }
  | { type: "skill_activation_requested"; skill_name: string }
  | { type: "tool_dispatch_started"; call_id: string; tool_name: string; args: unknown }
  | { type: "tool_dispatch_ended"; call_id: string; ok: boolean; error_message?: string | null };

export type PraxisTaskStatus =
  | "draft" | "running" | "paused" | "completed" | "failed" | "cancelled";

export interface TaskSummary {
  id: string;
  title?: string | null;
  status: PraxisTaskStatus;
  project_id?: string | null;
}

export interface CreateTaskRequest {
  title?: string | null;
  strategy_ref?: string | null;
  user_input?: string | null;
  project_id?: string | null;
}
```

- [ ] **Step 4:** Commit. `git add apps/web/src/lib/praxis apps/web/package.json && git commit -m "feat(praxis): vendor v0.1.0 contract + wire types"`

---

## Task 2: runtimeEventReducer (TDD)

**Files:**
- Create: `apps/web/src/lib/praxis/runtime-event-reducer.ts`
- Test: `apps/web/src/lib/praxis/__tests__/runtime-event-reducer.test.ts`

- [ ] **Step 1: Write failing tests.**

```ts
import { describe, expect, it } from "vitest";
import { initialTaskRunState, runtimeEventReducer, type TaskRunState } from "../runtime-event-reducer";
import type { RuntimeEvent } from "../runtime-events";

function seed(): TaskRunState {
  return initialTaskRunState({
    id: "t1", title: "生成 PPT", description: "生成 PPT",
    status: "pending", createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
    messages: [{ id: "u1", role: "user", content: "生成 PPT", createdAt: "2026-06-03T00:00:00.000Z" }],
    artifacts: [], toolTraces: [],
  });
}
const at = (s: TaskRunState, evs: RuntimeEvent[], now = 1000) =>
  evs.reduce((acc, ev) => runtimeEventReducer(acc, ev, now), s);

it("turn_started marks running", () => {
  expect(at(seed(), [{ type: "turn_started" }]).task.status).toBe("running");
});

it("text_delta accumulates into a streaming assistant message", () => {
  const s = at(seed(), [{ type: "turn_started" }, { type: "text_delta", chunk: "你好" }, { type: "text_delta", chunk: "世界" }]);
  const last = s.task.messages.at(-1)!;
  expect(last.role).toBe("assistant");
  expect(last.content).toBe("你好世界");
  expect(last.isStreaming).toBe(true);
});

it("tool dispatch start/end produces a closed trace with duration", () => {
  let s = runtimeEventReducer(seed(), { type: "tool_dispatch_started", call_id: "c1", tool_name: "slides.render", args: {} }, 1000);
  s = runtimeEventReducer(s, { type: "tool_dispatch_ended", call_id: "c1", ok: true }, 1500);
  const tr = s.task.toolTraces.at(-1)!;
  expect(tr.toolName).toBe("slides.render");
  expect(tr.status).toBe("success");
  expect(tr.durationMs).toBe(500);
});

it("tool end with ok=false marks error", () => {
  let s = runtimeEventReducer(seed(), { type: "tool_dispatch_started", call_id: "c1", tool_name: "x", args: {} }, 1000);
  s = runtimeEventReducer(s, { type: "tool_dispatch_ended", call_id: "c1", ok: false, error_message: "boom" }, 1100);
  expect(s.task.toolTraces.at(-1)!.status).toBe("error");
});

it("turn_completed finalizes message, synthesizes artifact, completes task", () => {
  const s = at(seed(), [{ type: "turn_started" }, { type: "text_delta", chunk: "done" }, { type: "turn_completed" }]);
  expect(s.task.status).toBe("completed");
  expect(s.task.messages.at(-1)!.isStreaming).toBe(false);
  expect(s.task.artifacts).toHaveLength(1);
  expect(s.task.artifacts[0].kind).toBe("document");
  expect(s.task.artifacts[0].title).toContain(".pptx");
});

it("turn_failed marks failed without synthesizing artifact", () => {
  const s = at(seed(), [{ type: "turn_started" }, { type: "turn_failed", reason: "nope" }]);
  expect(s.task.status).toBe("failed");
  expect(s.task.artifacts).toHaveLength(0);
});

it("turn_cancelled maps to failed", () => {
  expect(at(seed(), [{ type: "turn_started" }, { type: "turn_cancelled" }]).task.status).toBe("failed");
});

it("turn_paused / turn_resumed are no-ops for status", () => {
  const s = at(seed(), [{ type: "turn_started" }, { type: "turn_paused" }, { type: "turn_resumed" }]);
  expect(s.task.status).toBe("running");
});
```

- [ ] **Step 2:** Run `pnpm --filter @ash/web test` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `runtime-event-reducer.ts`:

```ts
import type { Artifact, Message, Task, ToolTrace } from "@ash/shared";
import type { RuntimeEvent } from "./runtime-events";

export interface TaskRunState {
  task: Task;
  currentAssistantId: string | null;
  toolStartMs: Record<string, number>;
  seq: number; // monotonic id source (avoids Date/random in this pure fn)
}

export function initialTaskRunState(task: Task): TaskRunState {
  return { task, currentAssistantId: null, toolStartMs: {}, seq: 0 };
}

const iso = (ms: number) => new Date(ms).toISOString();

// TODO(ash): replace synthesized artifact with praxis task_outputs mapping when Sprint 3d ships.
function synthesizePptArtifact(task: Task, nowMs: number): Artifact {
  const base = (task.title || "演示文稿").replace(/\.pptx$/i, "");
  return {
    id: `artifact-${task.id}-deck`,
    kind: "document",
    title: `${base}.pptx`,
    preview: "由智能体生成的演示文稿（占位）。",
    updatedAt: iso(nowMs),
  };
}

export function runtimeEventReducer(
  state: TaskRunState,
  event: RuntimeEvent,
  nowMs: number,
): TaskRunState {
  const task = state.task;
  switch (event.type) {
    case "turn_started":
      return patch(state, { status: "running", updatedAt: iso(nowMs) });
    case "text_delta": {
      let s = state;
      let id = state.currentAssistantId;
      let messages = task.messages;
      if (!id) {
        id = `assistant-${task.id}-${state.seq}`;
        const msg: Message = { id, role: "assistant", content: "", createdAt: iso(nowMs), isStreaming: true };
        messages = [...messages, msg];
        s = { ...state, currentAssistantId: id, seq: state.seq + 1 };
      }
      const next = messages.map((m) => (m.id === id ? { ...m, content: m.content + event.chunk } : m));
      return { ...s, task: { ...task, messages: next, updatedAt: iso(nowMs) } };
    }
    case "thinking_delta":
    case "skill_activation_requested":
      return state; // not surfaced this slice
    case "tool_dispatch_started": {
      const trace: ToolTrace = {
        id: event.call_id,
        toolName: event.tool_name,
        summary: summarizeArgs(event.args),
        status: "running",
        startedAt: iso(nowMs),
      };
      return {
        ...state,
        toolStartMs: { ...state.toolStartMs, [event.call_id]: nowMs },
        task: { ...task, toolTraces: [...task.toolTraces, trace], updatedAt: iso(nowMs) },
      };
    }
    case "tool_dispatch_ended": {
      const startMs = state.toolStartMs[event.call_id] ?? nowMs;
      const traces = task.toolTraces.map((tr) =>
        tr.id === event.call_id
          ? {
              ...tr,
              status: event.ok ? ("success" as const) : ("error" as const),
              durationMs: nowMs - startMs,
              summary: event.ok ? tr.summary : event.error_message || tr.summary,
            }
          : tr,
      );
      return { ...state, task: { ...task, toolTraces: traces, updatedAt: iso(nowMs) } };
    }
    case "turn_completed": {
      const messages = finalizeStreaming(task.messages, state.currentAssistantId);
      const artifact = synthesizePptArtifact(task, nowMs);
      return {
        ...state,
        currentAssistantId: null,
        task: {
          ...task,
          messages,
          artifacts: [...task.artifacts, artifact],
          status: "completed",
          completedAt: iso(nowMs),
          updatedAt: iso(nowMs),
        },
      };
    }
    case "turn_failed":
      return {
        ...state,
        currentAssistantId: null,
        task: { ...task, messages: finalizeStreaming(task.messages, state.currentAssistantId), status: "failed", updatedAt: iso(nowMs) },
      };
    case "turn_cancelled":
      return patch(state, { status: "failed", updatedAt: iso(nowMs) });
    case "turn_paused":
    case "turn_resumed":
      return state;
    default:
      return state;
  }
}

function patch(state: TaskRunState, fields: Partial<Task>): TaskRunState {
  return { ...state, task: { ...state.task, ...fields } };
}
function finalizeStreaming(messages: Message[], id: string | null): Message[] {
  if (!id) return messages;
  return messages.map((m) => (m.id === id ? { ...m, isStreaming: false } : m));
}
function summarizeArgs(args: unknown): string {
  if (args && typeof args === "object") {
    const keys = Object.keys(args as Record<string, unknown>);
    if (keys.length) return keys.map((k) => `${k}: ${String((args as Record<string, unknown>)[k])}`).join(", ").slice(0, 120);
  }
  return "";
}
```

- [ ] **Step 4:** Run `pnpm --filter @ash/web test` — expect PASS.

- [ ] **Step 5:** Commit. `git commit -am "feat(praxis): runtime event reducer with tests"`

---

## Task 3: PraxisTaskClient interface + fake + http scaffold

**Files:**
- Create: `apps/web/src/lib/praxis/client.ts`, `fake-client.ts`, `http-client.ts`

- [ ] **Step 1:** `client.ts`:

```ts
import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";
import { fakePraxisClient } from "./fake-client";

export interface PraxisTaskClient {
  createTask(req: CreateTaskRequest): Promise<TaskSummary>;
  startTask(id: string, userInput: string): Promise<TaskSummary>;
  streamEvents(id: string): AsyncIterable<RuntimeEvent>;
  sendMessage(id: string, text: string): Promise<void>;
  complete(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}

// Default = fake. The real impl needs a BFF SSE proxy route (gated, next slice).
export function getPraxisClient(): PraxisTaskClient {
  return fakePraxisClient;
}
```

- [ ] **Step 2:** `fake-client.ts` — emits real-shaped events for a "生成 PPT" script (use `crypto.randomUUID()`):

```ts
import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const summaries = new Map<string, TaskSummary>();

export const fakePraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    const id = crypto.randomUUID();
    const s: TaskSummary = { id, title: req.title ?? null, status: "draft", project_id: req.project_id ?? null };
    summaries.set(id, s);
    return s;
  },
  async startTask(id: string): Promise<TaskSummary> {
    const s = summaries.get(id);
    if (s) s.status = "running";
    return s ?? { id, status: "running" };
  },
  async *streamEvents(): AsyncIterable<RuntimeEvent> {
    yield { type: "turn_started" };
    for (const chunk of ["好的，", "我来为你生成", "一份演示文稿。", "先梳理大纲…"]) {
      await delay(160);
      yield { type: "text_delta", chunk };
    }
    yield { type: "tool_dispatch_started", call_id: "c1", tool_name: "outline.generate", args: { slides: 8 } };
    await delay(700);
    yield { type: "tool_dispatch_ended", call_id: "c1", ok: true };
    for (const chunk of ["大纲就绪，", "正在排版每一页…"]) {
      await delay(180);
      yield { type: "text_delta", chunk };
    }
    yield { type: "tool_dispatch_started", call_id: "c2", tool_name: "slides.render", args: { theme: "minimal" } };
    await delay(900);
    yield { type: "tool_dispatch_ended", call_id: "c2", ok: true };
    await delay(160);
    yield { type: "text_delta", chunk: "已完成，演示文稿见右侧工作区。" };
    await delay(120);
    yield { type: "turn_completed" };
  },
  async sendMessage() {},
  async complete() {},
  async cancel() {},
};
```

- [ ] **Step 3:** `http-client.ts` — scaffold, throws if used (documents the future BFF/SSE seam):

```ts
import type { PraxisTaskClient } from "./client";

// Scaffold for the real praxis transport. NOT enabled this slice: the SSE path
// requires a BFF proxy route (/api/praxis/...) that forwards the iam JWT and
// re-streams praxis text/event-stream. Gated until the streaming slice (see
// docs/adr/0007 + praxis ADR-0008). Methods throw to prevent accidental use.
const NOT_ENABLED = "praxis http client not enabled this slice (see docs/adr/0007)";

export const httpPraxisClient: PraxisTaskClient = {
  async createTask() { throw new Error(NOT_ENABLED); },
  async startTask() { throw new Error(NOT_ENABLED); },
  async *streamEvents() { throw new Error(NOT_ENABLED); },
  async sendMessage() { throw new Error(NOT_ENABLED); },
  async complete() { throw new Error(NOT_ENABLED); },
  async cancel() { throw new Error(NOT_ENABLED); },
};
```

- [ ] **Step 4:** `pnpm --filter @ash/web typecheck`. Commit. `git commit -am "feat(praxis): client interface, fake generator, http scaffold"`

---

## Task 4: TaskRunProvider (session run store)

**Files:**
- Create: `apps/web/src/components/workbench/task-run-provider.tsx`

- [ ] **Step 1:** Implement:

```tsx
"use client";

import type { Task } from "@ash/shared";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { getPraxisClient } from "@/lib/praxis/client";
import { initialTaskRunState, runtimeEventReducer } from "@/lib/praxis/runtime-event-reducer";

interface TaskRunContextValue {
  runs: Task[]; // newest first
  getRun(id: string): Task | undefined;
  startTask(directive: string): Promise<string>;
}

const TaskRunContext = createContext<TaskRunContextValue | null>(null);

export function TaskRunProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<Record<string, Task>>({});
  const [order, setOrder] = useState<string[]>([]);
  const client = useRef(getPraxisClient());

  const upsert = useCallback((task: Task) => {
    setRuns((prev) => ({ ...prev, [task.id]: task }));
  }, []);

  const startTask = useCallback(async (directive: string): Promise<string> => {
    const now = Date.now();
    const summary = await client.current.createTask({ user_input: directive, title: directive.slice(0, 40) });
    const seeded: Task = {
      id: summary.id,
      title: summary.title || directive.slice(0, 40),
      description: directive,
      status: "pending",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      messages: [{ id: `user-${summary.id}`, role: "user", content: directive, createdAt: new Date(now).toISOString() }],
      artifacts: [],
      toolTraces: [],
    };
    upsert(seeded);
    setOrder((prev) => [summary.id, ...prev.filter((x) => x !== summary.id)]);

    void (async () => {
      await client.current.startTask(summary.id, directive);
      let state = initialTaskRunState({ ...seeded, status: "running" });
      upsert(state.task);
      try {
        for await (const ev of client.current.streamEvents(summary.id)) {
          state = runtimeEventReducer(state, ev, Date.now());
          upsert(state.task);
        }
        await client.current.complete(summary.id); // settle praxis FSM (fake: no-op)
      } catch {
        upsert({ ...state.task, status: "failed" });
      }
    })();

    return summary.id;
  }, [upsert]);

  const value = useMemo<TaskRunContextValue>(() => ({
    runs: order.map((id) => runs[id]).filter(Boolean) as Task[],
    getRun: (id) => runs[id],
    startTask,
  }), [order, runs, startTask]);

  return <TaskRunContext.Provider value={value}>{children}</TaskRunContext.Provider>;
}

export function useTaskRuns(): Task[] {
  return useTaskRunContext().runs;
}
export function useTaskRun(id: string | undefined): Task | undefined {
  return id ? useTaskRunContext().getRun(id) : undefined;
}
export function useStartTask(): (directive: string) => Promise<string> {
  return useTaskRunContext().startTask;
}
function useTaskRunContext(): TaskRunContextValue {
  const ctx = useContext(TaskRunContext);
  if (!ctx) throw new Error("TaskRun hooks require <TaskRunProvider>");
  return ctx;
}
```

- [ ] **Step 2:** `pnpm --filter @ash/web typecheck`. Commit. `git commit -am "feat(workbench): TaskRunProvider session run store"`

---

## Task 5: Wire provider + home composer + app merge + task page

**Files (modify):** `(app)/layout.tsx`, `workbench-types.ts`, `workbench-app.tsx`, `workbench-home.tsx`, `app/task/[taskId]/page.tsx`

- [ ] **Step 1:** `(app)/layout.tsx` — wrap children with `TaskRunProvider` (inside the existing providers):

```tsx
import { TaskRunProvider } from "@/components/workbench/task-run-provider";
// ...
<SettingsModalProvider>
  <CommandPaletteProvider>
    <TaskRunProvider>{children}</TaskRunProvider>
  </CommandPaletteProvider>
</SettingsModalProvider>
```

- [ ] **Step 2:** `workbench-types.ts` — add `taskId?: string;` to `WorkbenchAppProps`.

- [ ] **Step 3:** `workbench-app.tsx` — import `useTaskRun`, `useTaskRuns`; accept `taskId`; resolve live task and merge sidebar tasks:

```ts
const sessionRuns = useTaskRuns();
const resolvedId = activeTask?.id ?? taskId;
const liveTask = useTaskRun(resolvedId) ?? activeTask;
const mergedTasks = [...sessionRuns, ...tasks.filter((t) => !sessionRuns.some((r) => r.id === t.id))];
```
Pass `mergedTasks` to `<WorkbenchSidebar tasks={mergedTasks} ...>` and `activeTaskId={liveTask?.id}`. Replace `activeTask` usages in the chat/workspace branches with `liveTask`. Guard: when `viewMode === "task"` and `!liveTask`, render a minimal "run not found" placeholder in the chat column (reuse `t("homeEmptyTitle")` style).

- [ ] **Step 4:** `workbench-home.tsx` — replace the local `messages` simulation with real start. Import `useStartTask` and `useRouter` from `@/i18n/navigation`. `handleStart` becomes:

```ts
const startTask = useStartTask();
const router = useRouter();
const handleStart = useCallback(async () => {
  const prompt = pendingPrompt || draft.trim();
  if (!prompt) return;
  clearPendingPrompt();
  setDraft("");
  const id = await startTask(prompt);
  router.push(taskHref(id));
}, [pendingPrompt, draft, startTask, router]);
```
Remove the now-unused local `messages` state + its JSX block.

- [ ] **Step 5:** `app/task/[taskId]/page.tsx` — drop the `notFound()` on missing server task; always render the workbench with `taskId` so the client resolves a session run:

```tsx
const activeTask = await getActiveTask(taskId, ashLocale);
return (
  <WorkbenchApp locale={ashLocale} tasks={tasks} projects={projects}
    activeTask={activeTask} taskId={taskId} viewMode="task" />
);
```
Remove the now-unused `notFound` import.

- [ ] **Step 6:** `pnpm --filter @ash/web typecheck && pnpm --filter @ash/web lint`. Commit. `git commit -am "feat(workbench): drive live task runs from home composer"`

---

## Task 6: i18n strings

**Files (modify):** `apps/web/messages/zh.json`, `apps/web/messages/en.json`

- [ ] **Step 1:** Under `Workbench`, add any new keys referenced (e.g. `runNotFoundTitle`). Add to BOTH files (kept in sync by `scripts/check-i18n.mjs`). zh-CN is the user-facing baseline.

- [ ] **Step 2:** Run `node scripts/check-i18n.mjs` — expect pass. Commit. `git commit -am "i18n: workbench live-run strings"`

---

## Task 7: Docs + ADRs

**Files:** new `docs/adr/0011-praxis-contract-and-live-task-execution.md`; modify `docs/adr/0007-transport-sse-vs-websocket.md`, `docs/components/workbench-chat.md`, `docs/components/workbench-workspace.md`

- [ ] **Step 1:** ADR-0011 (Accepted): consume praxis OpenAPI v0.1.0; generate REST types; hand-author RuntimeEvent (not in OpenAPI); fake client + reducer; artifact synthesis as provisional seam (praxis Sprint 3d); paused→auto-complete; session-only runs.

- [ ] **Step 2:** ADR-0007: change Status `Proposed` → `Accepted`; decision = SSE for events + POST for control, aligning with praxis ADR-0008; note real SSE route still gated to the streaming slice.

- [ ] **Step 3:** Update both component docs with the running-state data sourcing (live from `TaskRunProvider` via reducer; artifact synthesized client-side, labelled provisional).

- [ ] **Step 4:** Commit. `git commit -am "docs: ADR-0011 + ADR-0007 accepted + component running-state notes"`

---

## Task 8: Verify + PR

- [ ] **Step 1:** From repo root: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`. All green.
- [ ] **Step 2:** Manual smoke (optional, via `pnpm --filter @ash/web dev`): login → home → type "生成一个 PPT" → see streaming + tools + artifact; sidebar shows running→completed.
- [ ] **Step 3:** Push branch, open PR with summary + screenshots/notes + spec/plan links.

---

## Self-review notes

- Spec coverage: types (T1), reducer+artifact synth+status map+paused (T2), client/fake/http (T3), provider+session runs (T4), UI wiring incl. task-page 404 tolerance (T5), i18n (T6), ADR-0007 accepted + ADR-0011 + component docs (T7), gates+PR (T8). Project view untouched (out of scope) — confirmed.
- RuntimeEvent intentionally hand-authored (absent from OpenAPI) — documented in T1 Step 3.
- Reducer is pure with injected `nowMs` (no Date/random) → deterministic tests; provider supplies `Date.now()`.
</content>
