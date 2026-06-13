# Praxis 0.1.5 Interactive Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade ash's vendored praxis contract to 0.1.5 and add interactive task execution — the agent can pause mid-turn with `ask_user`, the user answers, the turn resumes — plus same-session `/history` catch-up on stream re-attach.

**Architecture:** Extend the existing seam. New delta variants fold through the pure `runtimeEventReducer`; `/history` is projected in bulk by a new pure `historyToTask`; the only async/stateful additions (`answer` action, re-attach) live in `TaskRunProvider`. Both wire event unions (`RuntimeEvent`, `HistoryEvent`) become generated types — the hand-mirror is retired.

**Tech Stack:** TypeScript (strict), Next.js (App Router), React, next-intl, Vitest + Testing Library, `openapi-typescript`, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-06-13-praxis-interactive-execution-design.md`

**Upstream contract:** `github.com/nathan-tsien/praxis` tag `openapi-v0.1.5`. A checkout exists at `/tmp/praxis-upstream` (run `git -C /tmp/praxis-upstream checkout openapi-v0.1.5 -- openapi/praxis.yaml openapi/schemas.json` to pin the tag's files; re-clone if absent).

**Conventions (from CLAUDE.md / AGENTS.md):** comments + dev logs in English; user-facing strings zh-CN baseline (add to both `apps/web/messages/zh.json` and `en.json`); no rogue palette literals (design tokens only); `pnpm --filter @ash/web` for web tasks. Commit after every green task.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/src/lib/praxis/contract/praxis.yaml`, `schemas.json` | Vendored 0.1.5 contract | Replace |
| `apps/web/src/lib/praxis/generated.ts` | Generated wire + event types | Regenerate |
| `apps/web/src/lib/praxis/runtime-events.ts` | Curated re-export of generated types | Rewrite (remove hand-mirror) |
| `packages/shared/src/types.ts` | `Task` view-model + `TaskStatus` + `PendingQuestion` | Modify |
| `apps/web/src/lib/task-status.ts` | Domain status → StatusDot variant + label key | Modify |
| `apps/web/src/lib/praxis/runtime-event-reducer.ts` | Fold delta events into `Task` | Modify (new cases + labels) |
| `apps/web/src/lib/praxis/history-projection.ts` | Pure `historyToTask` bulk projector | Create |
| `apps/web/src/lib/praxis/client.ts` | `PraxisTaskClient` interface + selector | Modify (`answer`, `history`) |
| `apps/web/src/lib/praxis/http-client.ts` | Real transport | Modify (`answer`, `history`, `ErrorBody.code`) |
| `apps/web/src/lib/praxis/fake-client.ts` | Fake transport / fixture | Modify (interactive script + history) |
| `apps/web/src/components/workbench/task-run-provider.tsx` | Run orchestration + state | Modify (`answer`, re-attach, `stream_end`) |
| `apps/web/src/components/workbench/chat/answer-prompt.tsx` | Pending-question affordance | Create |
| `apps/web/src/components/workbench/chat/workbench-chat.tsx` | Thread `pendingQuestion` + `onAnswer` | Modify |
| `apps/web/src/components/workbench/workbench-app.tsx` | Source affordance props from live task | Modify |
| `apps/web/messages/zh.json`, `en.json` | New Workbench UI strings | Modify |
| `docs/adr/0015-praxis-0.1.5-interactive-execution.md` | Decision record | Create |
| `docs/adr/0011-praxis-contract-and-live-task-execution.md` | Supersession note | Modify |
| `docs/components/*` | Chat affordance + status doc | Modify |

Test files live beside their units under `__tests__/` (existing pattern).

---

## Task 1: Re-vendor the 0.1.5 contract and regenerate types

**Files:**
- Replace: `apps/web/src/lib/praxis/contract/praxis.yaml`, `apps/web/src/lib/praxis/contract/schemas.json`
- Regenerate: `apps/web/src/lib/praxis/generated.ts`

- [ ] **Step 1: Copy the 0.1.5 contract into the repo**

```bash
git -C /tmp/praxis-upstream checkout openapi-v0.1.5 -- openapi/praxis.yaml openapi/schemas.json
cp /tmp/praxis-upstream/openapi/praxis.yaml apps/web/src/lib/praxis/contract/praxis.yaml
cp /tmp/praxis-upstream/openapi/schemas.json apps/web/src/lib/praxis/contract/schemas.json
```

(If `/tmp/praxis-upstream` is gone: `git clone https://github.com/nathan-tsien/praxis /tmp/praxis-upstream` first.)

- [ ] **Step 2: Confirm the version landed**

Run: `grep -m1 'version:' apps/web/src/lib/praxis/contract/praxis.yaml`
Expected: `  version: 0.1.5`

- [ ] **Step 3: Regenerate the types**

Run: `pnpm --filter @ash/web gen:praxis`
Expected: command exits 0, rewrites `apps/web/src/lib/praxis/generated.ts`.

- [ ] **Step 4: Verify the new schemas are present in generated output**

Run: `grep -E 'RuntimeEvent|HistoryEvent|HistoryItem|TaskHistoryPage|AnswerRequest|awaiting_input' apps/web/src/lib/praxis/generated.ts | head`
Expected: matches for each name (the event unions, `AnswerRequest`, and the `awaiting_input` status literal all appear under `components["schemas"]`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/contract/praxis.yaml apps/web/src/lib/praxis/contract/schemas.json apps/web/src/lib/praxis/generated.ts
git commit -m "feat(praxis): re-vendor contract at 0.1.5 and regenerate types"
```

---

## Task 2: Retire the hand-mirror — re-export generated event types

**Files:**
- Rewrite: `apps/web/src/lib/praxis/runtime-events.ts`

- [ ] **Step 1: Replace the file with generated re-exports**

```ts
// praxis wire types — re-exported from the generated OpenAPI client.
//
// As of praxis 0.1.5 BOTH event unions are defined in the OpenAPI document
// (components.schemas.RuntimeEvent / HistoryEvent), so they are generated by
// `openapi-typescript` (run `pnpm --filter @ash/web gen:praxis`) rather than
// hand-mirrored. praxis owns the contract; regenerate when it revises.
// (Supersedes the hand-authored RuntimeEvent union; see ADR-0015.)

import type { components } from "./generated";

export type TaskSummary = components["schemas"]["TaskSummary"];
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"];
export type PraxisTaskStatus = components["schemas"]["TaskStatus"];
export type AnswerRequest = components["schemas"]["AnswerRequest"];

/** SSE runtime event stream (delta-shaped tagged union, discriminator `type`). */
export type RuntimeEvent = components["schemas"]["RuntimeEvent"];

/** Historical conversation event (completed-block tagged union). */
export type HistoryEvent = components["schemas"]["HistoryEvent"];
export type HistoryItem = components["schemas"]["HistoryItem"];
export type TaskHistoryPage = components["schemas"]["TaskHistoryPage"];
```

- [ ] **Step 2: Typecheck (expect failures elsewhere — that's fine here)**

Run: `pnpm --filter @ash/web exec tsc --noEmit 2>&1 | head -30`
Expected: `runtime-events.ts` itself reports no error; downstream files may error until later tasks. Confirm the re-export names resolve (no "has no exported member" against `generated`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/praxis/runtime-events.ts
git commit -m "feat(praxis): generate RuntimeEvent/HistoryEvent, retire hand-mirror"
```

---

## Task 3: Add `awaiting_input` + `pendingQuestion` to the Task model

**Files:**
- Modify: `packages/shared/src/types.ts:55-69`

- [ ] **Step 1: Extend the status union and Task interface**

Replace the `TaskStatus` type and `Task` interface (lines 55-69) with:

```ts
export type TaskStatus =
  | "pending"
  | "running"
  | "awaiting_input"
  | "completed"
  | "failed";

/** A question the agent is waiting on (praxis `ask_user`). */
export interface PendingQuestion {
  /** Live correlation id; required to POST an answer. Empty when recovered
   *  from history before the live stream re-emits it (read-only). */
  askId: string;
  /** Question text shown to the user. */
  text: string;
  /** Workspace-relative attachment refs; [] when none. */
  attachments: string[];
}

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
  /** Present iff status === "awaiting_input". */
  pendingQuestion?: PendingQuestion;
}
```

- [ ] **Step 2: Verify the shared package still builds its types**

Run: `pnpm --filter @ash/shared exec tsc --noEmit`
Expected: PASS (additive change).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(shared): add awaiting_input status + pendingQuestion to Task"
```

---

## Task 4: Map `awaiting_input` in the status presentation helpers

**Files:**
- Modify: `apps/web/src/lib/task-status.ts`
- Modify: `apps/web/messages/zh.json`, `apps/web/messages/en.json` (Workbench namespace)
- Test: `apps/web/src/lib/__tests__/task-status.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/__tests__/task-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { taskStatusDotVariant, taskStatusLabelKey } from "../task-status";

describe("task-status helpers", () => {
  it("awaiting_input maps to the running dot variant", () => {
    expect(taskStatusDotVariant("awaiting_input")).toBe("running");
  });

  it("awaiting_input maps to its own label key", () => {
    expect(taskStatusLabelKey("awaiting_input")).toBe("awaitingInput");
  });

  it("existing statuses are unchanged", () => {
    expect(taskStatusDotVariant("completed")).toBe("success");
    expect(taskStatusLabelKey("failed")).toBe("failed");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web exec vitest run src/lib/__tests__/task-status.test.ts`
Expected: FAIL (`awaiting_input` not handled; `awaitingInput` not a valid return type).

- [ ] **Step 3: Update the helpers**

In `apps/web/src/lib/task-status.ts`, add an `awaiting_input` case to `taskStatusDotVariant` (return `"running"` so the dot pulses) and widen + handle `taskStatusLabelKey`:

```ts
export function taskStatusDotVariant(
  status: TaskStatus,
): NonNullable<StatusDotProps["status"]> {
  switch (status) {
    case "running":
    case "awaiting_input":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

export function taskStatusLabelKey(
  status: TaskStatus,
): "running" | "awaitingInput" | "completed" | "failed" | "pending" {
  switch (status) {
    case "running":
      return "running";
    case "awaiting_input":
      return "awaitingInput";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
```

- [ ] **Step 4: Add the i18n label**

In `apps/web/messages/zh.json`, inside the `"Workbench"` object, add: `"awaitingInput": "等待你的回复"`.
In `apps/web/messages/en.json`, inside the `"Workbench"` object, add: `"awaitingInput": "Waiting for you"`.
(Place near the existing `"pending"` / `"running"` keys.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ash/web exec vitest run src/lib/__tests__/task-status.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/task-status.ts apps/web/src/lib/__tests__/task-status.test.ts apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(workbench): present awaiting_input task status"
```

---

## Task 5: Extend the reducer — ask_user, turn_resumed, notify_user, stream_end, stop_reason

**Files:**
- Modify: `apps/web/src/lib/praxis/runtime-event-reducer.ts`
- Test: `apps/web/src/lib/praxis/__tests__/runtime-event-reducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/lib/praxis/__tests__/runtime-event-reducer.test.ts` (inside the existing `describe`):

```ts
  it("ask_user moves the task to awaiting_input with a pending question", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "ask_user", ask_id: "q1", text: "Which audience?", attachments: [] },
    ]);
    expect(s.task.status).toBe("awaiting_input");
    expect(s.task.pendingQuestion).toEqual({
      askId: "q1",
      text: "Which audience?",
      attachments: [],
    });
  });

  it("turn_resumed clears the pending question and returns to running", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "ask_user", ask_id: "q1", text: "Which audience?", attachments: [] },
      { type: "turn_resumed" },
    ]);
    expect(s.task.status).toBe("running");
    expect(s.task.pendingQuestion).toBeUndefined();
  });

  it("notify_user appends an assistant message", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "notify_user", text: "Saved draft.pptx", attachments: ["draft.pptx"] },
    ]);
    const last = s.task.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.content).toContain("Saved draft.pptx");
  });

  it("stream_end with a completed status marks the task completed", () => {
    const s = run(seed(), [{ type: "turn_started" }, { type: "stream_end", task_status: "completed" }]);
    expect(s.task.status).toBe("completed");
  });

  it("stream_end with a failed status marks the task failed", () => {
    const s = run(seed(), [{ type: "turn_started" }, { type: "stream_end", task_status: "failed" }]);
    expect(s.task.status).toBe("failed");
  });

  it("stream_end with a non-terminal status leaves the task as-is", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "ask_user", ask_id: "q1", text: "?", attachments: [] },
      { type: "stream_end", task_status: "awaiting_input" },
    ]);
    expect(s.task.status).toBe("awaiting_input");
  });

  it("turn_completed with stop_reason max_tokens appends a truncation notice", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "text_delta", chunk: "partial answer" },
      { type: "turn_completed", stop_reason: "max_tokens" },
    ]);
    expect(s.task.status).toBe("completed");
    expect(s.task.messages.some((m) => m.content.includes("truncated"))).toBe(true);
  });
```

Also extend the test's `labels` object (top of file) to include the two new label fields:

```ts
const labels: ReducerLabels = {
  deckFallbackTitle: "Presentation",
  deckPreview: "preview",
  failureNotice: (reason) => `Task failed: ${reason}`,
  notifyMessage: (text) => text,
  truncationNotice: "Response was truncated (max tokens).",
};
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/runtime-event-reducer.test.ts`
Expected: FAIL (new label fields missing; new event cases unhandled fall through `default`).

- [ ] **Step 3: Extend `ReducerLabels`**

In `runtime-event-reducer.ts`, add to the `ReducerLabels` interface (after `failureNotice`):

```ts
  /** Builds an assistant message from a praxis notify_user event. */
  notifyMessage: (text: string) => string;
  /** Notice appended when a turn completed with stop_reason "max_tokens". */
  truncationNotice: string;
```

- [ ] **Step 4: Add the `ask_user` and `turn_resumed` cases**

Replace the existing `case "turn_paused": case "turn_resumed": return state;` block with:

```ts
    case "ask_user":
      return {
        ...state,
        task: {
          ...task,
          status: "awaiting_input",
          pendingQuestion: {
            askId: event.ask_id,
            text: event.text,
            attachments: event.attachments ?? [],
          },
          updatedAt: iso(nowMs),
        },
      };

    case "turn_resumed": {
      const { pendingQuestion: _cleared, ...rest } = task;
      return { ...state, task: { ...rest, status: "running", updatedAt: iso(nowMs) } };
    }

    case "turn_paused":
      return state;

    case "notify_user": {
      const notice: Message = {
        id: `assistant-${task.id}-notify-${state.seq}`,
        role: "assistant",
        content: labels.notifyMessage(event.text),
        createdAt: iso(nowMs),
      };
      return {
        ...state,
        seq: state.seq + 1,
        task: { ...task, messages: [...task.messages, notice], updatedAt: iso(nowMs) },
      };
    }

    case "stream_end": {
      const mapped =
        event.task_status === "completed"
          ? "completed"
          : event.task_status === "failed" || event.task_status === "cancelled"
            ? "failed"
            : null;
      if (!mapped) return state; // non-terminal (e.g. awaiting_input): leave as-is
      return patch(state, {
        status: mapped,
        ...(mapped === "completed" ? { completedAt: iso(nowMs) } : {}),
        updatedAt: iso(nowMs),
      });
    }
```

- [ ] **Step 5: Add the truncation notice to `turn_completed`**

In the existing `case "turn_completed":` block, after computing `messages` and `artifact`, append a notice when truncated. Replace the block body with:

```ts
    case "turn_completed": {
      const finalized = finalizeStreaming(task.messages, state.currentAssistantId);
      const artifact = synthesizePptArtifact(task, nowMs, labels);
      const truncated = event.stop_reason === "max_tokens";
      const messages = truncated
        ? [
            ...finalized,
            {
              id: `assistant-${task.id}-trunc-${state.seq}`,
              role: "assistant" as const,
              content: labels.truncationNotice,
              createdAt: iso(nowMs),
            },
          ]
        : finalized;
      return {
        ...state,
        currentAssistantId: null,
        seq: truncated ? state.seq + 1 : state.seq,
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
```

- [ ] **Step 6: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/runtime-event-reducer.test.ts`
Expected: PASS (all old + new tests). If `fake-run.test.ts` now fails to typecheck on `labels`, that is fixed in Task 8's `labels` update — for now run only this file.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/praxis/runtime-event-reducer.ts apps/web/src/lib/praxis/__tests__/runtime-event-reducer.test.ts
git commit -m "feat(praxis): reduce ask_user/turn_resumed/notify_user/stream_end/stop_reason"
```

---

## Task 6: History projector — `historyToTask`

**Files:**
- Create: `apps/web/src/lib/praxis/history-projection.ts`
- Test: `apps/web/src/lib/praxis/__tests__/history-projection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/praxis/__tests__/history-projection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import type { HistoryItem } from "../runtime-events";
import { historyToTask, type HistoryLabels } from "../history-projection";

const labels: HistoryLabels = {
  deckFallbackTitle: "Presentation",
  deckPreview: "preview",
  notifyMessage: (t) => t,
};

function seed(): Task {
  return {
    id: "t1",
    title: "生成 PPT",
    description: "生成 PPT",
    status: "running",
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
    messages: [],
    artifacts: [],
    toolTraces: [],
  };
}

// items() takes chronological events and stamps newest-first (as praxis returns).
function items(events: HistoryItem["event"][]): HistoryItem[] {
  return events
    .map((event, i) => ({ seq: i, ts: `2026-06-13T00:00:0${i}.000Z`, event }))
    .reverse();
}

describe("historyToTask", () => {
  it("returns the seed unchanged for an empty page", () => {
    expect(historyToTask(seed(), [], labels).messages).toHaveLength(0);
  });

  it("projects messages in chronological order from newest-first items", () => {
    const task = historyToTask(
      seed(),
      items([
        { type: "user_message", content: "生成 PPT" },
        { type: "assistant_message", text: "好的" },
      ]),
      labels,
    );
    expect(task.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(task.messages[1].content).toBe("好的");
  });

  it("projects a closed tool trace from tool_use + tool_result", () => {
    const task = historyToTask(
      seed(),
      items([
        { type: "tool_use", call_id: "c1", tool_name: "slides.render", args: { theme: "x" } },
        { type: "tool_result", call_id: "c1", ok: true },
      ]),
      labels,
    );
    expect(task.toolTraces).toHaveLength(1);
    expect(task.toolTraces[0].status).toBe("success");
  });

  it("projects a historical ask_user as a read-only pending question (no askId)", () => {
    const task = historyToTask(
      seed(),
      items([{ type: "ask_user", text: "Which audience?", attachments: [] }]),
      labels,
    );
    expect(task.status).toBe("awaiting_input");
    expect(task.pendingQuestion).toEqual({ askId: "", text: "Which audience?", attachments: [] });
  });

  it("marks the task completed on a historical turn_completed", () => {
    const task = historyToTask(seed(), items([{ type: "turn_completed" }]), labels);
    expect(task.status).toBe("completed");
    expect(task.artifacts).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/history-projection.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the projector**

Create `apps/web/src/lib/praxis/history-projection.ts`:

```ts
import type { Artifact, Message, Task, ToolTrace } from "@ash/shared";
import type { HistoryEvent, HistoryItem } from "./runtime-events";

/**
 * Bulk projection of a task's persisted `/history` (newest-first HistoryItems)
 * into ash's `Task` view-model. Pure and deterministic — timestamps come from
 * each item's `ts`, ids from `call_id` / index, so it is fully unit-testable.
 *
 * History carries COMPLETED blocks (not deltas) and does not overlap the live
 * RuntimeEvent stream: the provider rebuilds from history, then subscribes for
 * live deltas. A historical `ask_user` has no `ask_id`; it projects as a
 * read-only pending question (empty askId) until the live re-subscribe re-emits
 * it with the real correlation id.
 */
export interface HistoryLabels {
  deckFallbackTitle: string;
  deckPreview: string;
  notifyMessage: (text: string) => string;
}

export function historyToTask(seed: Task, items: HistoryItem[], labels: HistoryLabels): Task {
  // praxis returns newest-first; fold in chronological order.
  const chronological = [...items].reverse();
  let task: Task = { ...seed, messages: [...seed.messages], toolTraces: [...seed.toolTraces], artifacts: [...seed.artifacts] };
  const toolStart: Record<string, string> = {};

  for (const item of chronological) {
    task = foldHistoryEvent(task, item.event, item.ts, toolStart, labels);
  }
  return task;
}

function foldHistoryEvent(
  task: Task,
  event: HistoryEvent,
  ts: string,
  toolStart: Record<string, string>,
  labels: HistoryLabels,
): Task {
  switch (event.type) {
    case "user_message":
      return push(task, message("user", String(event.content ?? ""), ts, task));
    case "assistant_message":
      return push(task, message("assistant", event.text, ts, task));
    case "thinking":
      return task; // reasoning channel not surfaced (parity with the live reducer)
    case "notify_user":
      return push(task, message("assistant", labels.notifyMessage(event.text), ts, task));
    case "tool_use": {
      toolStart[event.call_id] = ts;
      const trace: ToolTrace = {
        id: event.call_id,
        toolName: event.tool_name,
        summary: summarizeArgs(event.args),
        status: "running",
        startedAt: ts,
      };
      return { ...task, toolTraces: [...task.toolTraces, trace] };
    }
    case "tool_result": {
      const startedAt = toolStart[event.call_id] ?? ts;
      const durationMs = Math.max(0, Date.parse(ts) - Date.parse(startedAt));
      const traces = task.toolTraces.map((tr) =>
        tr.id === event.call_id
          ? {
              ...tr,
              status: event.ok ? ("success" as const) : ("error" as const),
              durationMs,
              summary: event.ok ? tr.summary : event.error_message || tr.summary,
            }
          : tr,
      );
      return { ...task, toolTraces: traces };
    }
    case "ask_user":
      return {
        ...task,
        status: "awaiting_input",
        pendingQuestion: { askId: "", text: event.text, attachments: event.attachments ?? [] },
      };
    case "turn_completed":
      return {
        ...task,
        status: "completed",
        completedAt: ts,
        artifacts: [...task.artifacts, synthesizeArtifact(task, ts, labels)],
      };
    case "turn_failed":
      return { ...task, status: "failed" };
    default:
      return task; // tolerate unknown variants (the union only grows)
  }
}

function message(role: Message["role"], content: string, ts: string, task: Task): Message {
  return { id: `hist-${task.id}-${role}-${task.messages.length}`, role, content, createdAt: ts };
}

function push(task: Task, msg: Message): Task {
  return { ...task, messages: [...task.messages, msg] };
}

function synthesizeArtifact(task: Task, ts: string, labels: HistoryLabels): Artifact {
  const base = (task.title || labels.deckFallbackTitle).replace(/\.pptx$/i, "");
  return { id: `artifact-${task.id}-deck`, kind: "document", title: `${base}.pptx`, preview: labels.deckPreview, updatedAt: ts };
}

function summarizeArgs(args: unknown): string {
  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0) {
      return keys.map((k) => `${k}: ${String(record[k])}`).join(", ").slice(0, 120);
    }
  }
  return "";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/history-projection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/history-projection.ts apps/web/src/lib/praxis/__tests__/history-projection.test.ts
git commit -m "feat(praxis): add historyToTask bulk projector"
```

---

## Task 7: Client interface + HTTP transport — `answer` and `history`

**Files:**
- Modify: `apps/web/src/lib/praxis/client.ts`
- Modify: `apps/web/src/lib/praxis/http-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/http-client.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/lib/praxis/__tests__/http-client.test.ts` (inside the `describe`):

```ts
  it("answer POSTs ask_id + answer to the answers endpoint and tolerates 202", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response(null, { status: 202 }));

    await expect(httpPraxisClient.answer("t1", "q1", "marketers")).resolves.toBeUndefined();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/praxis/tasks/t1/answers");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ ask_id: "q1", answer: "marketers" });
  });

  it("history GETs the history endpoint and returns the page", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"items":[{"seq":0,"ts":"2026-06-13T00:00:00.000Z","event":{"type":"assistant_message","text":"hi"}}],"next_cursor":null}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const page = await httpPraxisClient.history("t1");
    expect(page.items).toHaveLength(1);
    expect(page.next_cursor).toBeNull();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/praxis/tasks/t1/history");
  });

  it("history forwards limit + cursor as query params", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response('{"items":[]}', { status: 200, headers: { "content-type": "application/json" } }));

    await httpPraxisClient.history("t1", "abc");
    expect(fetchFn.mock.calls[0][0]).toBe("/api/praxis/tasks/t1/history?cursor=abc");
  });

  it("surfaces ErrorBody.code in the thrown error", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"code":"task_not_found","message":"nope"}', {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(httpPraxisClient.history("t1")).rejects.toThrow(/task_not_found/);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/http-client.test.ts`
Expected: FAIL (`answer`/`history` not on the client).

- [ ] **Step 3: Extend the `PraxisTaskClient` interface**

In `apps/web/src/lib/praxis/client.ts`, add the two methods to the interface and update the imports:

```ts
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskSummary } from "./runtime-events";
```

Inside `interface PraxisTaskClient`, after `sendMessage`:

```ts
  /** POST /v1/tasks/{id}/answers — answer a pending ask_user question. */
  answer(id: string, askId: string, answer: string): Promise<void>;
  /** GET /v1/tasks/{id}/history — one page of historical events, newest-first. */
  history(id: string, cursor?: string): Promise<TaskHistoryPage>;
```

- [ ] **Step 4: Implement in the HTTP client**

In `apps/web/src/lib/praxis/http-client.ts`:

(a) Update imports:

```ts
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskSummary } from "./runtime-events";
```

(b) Make `postJson` surface `ErrorBody.code`. Replace the `if (!res.ok)` line in `postJson` with a shared helper and add a `getJson`. Replace the existing `postJson` definition with:

```ts
async function readError(res: Response, method: string, url: string): Promise<Error> {
  let code = "";
  try {
    const body = (await res.json()) as { code?: string };
    code = body?.code ?? "";
  } catch {
    // non-JSON error body; fall through to status-only message
  }
  const suffix = code ? ` (${code})` : "";
  return new Error(`praxis ${method} ${url} -> ${res.status}${suffix}`);
}

async function postJson<T>(url: string, body?: unknown): Promise<T | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await readError(res, "POST", url);
  if (res.status === 204 || res.status === 202) return undefined;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : undefined;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw await readError(res, "GET", url);
  return (await res.json()) as T;
}
```

(c) Add `answer` and `history` to the `httpPraxisClient` object (after `sendMessage`):

```ts
  async answer(id: string, askId: string, answer: string): Promise<void> {
    await postJson(`${BASE}/${id}/answers`, { ask_id: askId, answer });
  },

  async history(id: string, cursor?: string): Promise<TaskHistoryPage> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return getJson<TaskHistoryPage>(`${BASE}/${id}/history${qs}`);
  },
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/http-client.test.ts`
Expected: PASS (the existing 500 test still throws; the new code-bearing test asserts the code in the message).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/praxis/client.ts apps/web/src/lib/praxis/http-client.ts apps/web/src/lib/praxis/__tests__/http-client.test.ts
git commit -m "feat(praxis): add answer + history to client and http transport"
```

---

## Task 8: Fake client — interactive script, answer/resume, history, stream_end

**Files:**
- Modify: `apps/web/src/lib/praxis/fake-client.ts`
- Modify: `apps/web/src/lib/praxis/__tests__/fake-run.test.ts`

The fake must let the existing one-shot test keep passing while adding an interactive path the provider/UI tests can drive deterministically. Model it as: the stream emits `ask_user` then **waits** until `answer()` is called, then resumes and completes. A scripted in-memory `history()` returns the committed blocks.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/lib/praxis/__tests__/fake-run.test.ts`:

```ts
import { runtimeEventReducer as _reducer } from "../runtime-event-reducer"; // already imported above; keep one import

describe("fake praxis interactive run", () => {
  it("pauses on ask_user, resumes after answer, and completes", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "ask me", title: "ask me" });
    const ev: string[] = [];

    // Consume the stream in the background; answer once it pauses.
    const pump = (async () => {
      for await (const e of fakePraxisClient.streamEvents(summary.id)) {
        ev.push(e.type);
        if (e.type === "ask_user") {
          await fakePraxisClient.answer(summary.id, (e as { ask_id: string }).ask_id, "yes");
        }
      }
    })();

    await pump;
    expect(ev).toContain("ask_user");
    expect(ev.indexOf("turn_resumed")).toBeGreaterThan(ev.indexOf("ask_user"));
    expect(ev.at(-1)).toBe("stream_end");
  });

  it("history() returns newest-first committed blocks", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "x", title: "x" });
    const page = await fakePraxisClient.history(summary.id);
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.next_cursor ?? null).toBeNull();
  });
});
```

To trigger the interactive branch deterministically, the fake keys off the task's `user_input`. Update the existing "generate a PPT" test's title if needed so it does NOT contain "ask" (it uses "生成一个 PPT" — fine, stays one-shot).

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/fake-run.test.ts`
Expected: FAIL (`answer`/`history` missing; no `ask_user`/`stream_end` emitted).

- [ ] **Step 3: Rewrite the fake client**

Replace `apps/web/src/lib/praxis/fake-client.ts` with:

```ts
import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskSummary } from "./runtime-events";

/**
 * Local fake praxis client. Emits real-shaped events for a scripted run, with
 * timing so the UI streams believably. No network. Fixture, not a contract.
 *
 * Two scripts: the default "generate a PPT" one-shot, and an interactive one
 * (when the task's user_input contains "ask") that pauses on `ask_user` until
 * `answer()` resolves, then resumes and completes. zh-CN chunks are simulated
 * agent output, not UI chrome (IMPL-3; deviation D-12).
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface FakeRun {
  summary: TaskSummary;
  interactive: boolean;
  answered?: { resolve: () => void; promise: Promise<void> };
}

const runs = new Map<string, FakeRun>();

export const fakePraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    const id = crypto.randomUUID();
    const summary: TaskSummary = {
      id,
      title: req.title ?? null,
      status: "draft",
      project_id: req.project_id ?? null,
    };
    runs.set(id, { summary, interactive: !!req.user_input && req.user_input.includes("ask") });
    return summary;
  },

  async startTask(id: string): Promise<TaskSummary> {
    const run = runs.get(id);
    if (run) {
      run.summary.status = "running";
      return run.summary;
    }
    return { id, status: "running" };
  },

  async *streamEvents(id: string): AsyncIterable<RuntimeEvent> {
    const run = runs.get(id);
    yield { type: "turn_started" };
    for (const chunk of ["好的，", "我来为你生成", "一份演示文稿。", "先梳理大纲…"]) {
      await delay(160);
      yield { type: "text_delta", chunk };
    }

    if (run?.interactive) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      run.answered = { resolve, promise };
      yield { type: "ask_user", ask_id: "q1", text: "需要面向什么受众？", attachments: [] };
      await promise; // blocks until answer() is called
      yield { type: "turn_resumed" };
    }

    yield { type: "tool_dispatch_started", call_id: "c1", tool_name: "outline.generate", args: { slides: 8 } };
    await delay(500);
    yield { type: "tool_dispatch_ended", call_id: "c1", ok: true };

    await delay(120);
    yield { type: "text_delta", chunk: "已完成，演示文稿见右侧工作区。" };
    await delay(80);
    yield { type: "turn_completed" };
    yield { type: "stream_end", task_status: "completed" };
  },

  async sendMessage(): Promise<void> {},

  async answer(id: string): Promise<void> {
    runs.get(id)?.answered?.resolve();
  },

  async history(): Promise<TaskHistoryPage> {
    // Scripted committed blocks (newest-first), enough to exercise the projector.
    return {
      items: [
        { seq: 1, ts: "2026-06-13T00:00:01.000Z", event: { type: "assistant_message", text: "好的" } },
        { seq: 0, ts: "2026-06-13T00:00:00.000Z", event: { type: "user_message", content: "生成 PPT" } },
      ],
      next_cursor: null,
    };
  },

  async complete(): Promise<void> {},
  async cancel(): Promise<void> {},
};
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/fake-run.test.ts`
Expected: PASS (both the original one-shot test and the two interactive tests). The one-shot test must also tolerate the trailing `stream_end` — it folds to `completed` either way; confirm it still asserts `completed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/fake-client.ts apps/web/src/lib/praxis/__tests__/fake-run.test.ts
git commit -m "feat(praxis): interactive fake client (ask_user/answer/history/stream_end)"
```

---

## Task 9: Provider — `answer` action, `stream_end` termination, re-attach via history

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Test: `apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx`. First, extend `Harness` to expose `answer` and `attach`, and the pending question text. Replace the existing `Harness` with:

```tsx
import { useAnswerTask, useAttachTask } from "../task-run-provider"; // new hooks (Task 9)

function Harness() {
  const startTask = useStartTask();
  const answer = useAnswerTask();
  const attach = useAttachTask();
  const [id, setId] = useState<string>();
  const run = useTaskRun(id);
  return (
    <div>
      <button onClick={() => void startTask("ask me").then(setId)}>start</button>
      <button onClick={() => id && void answer(id, "yes")}>answer</button>
      <button onClick={() => id && void attach(id)}>attach</button>
      <span data-testid="status">{run?.status ?? "none"}</span>
      <span data-testid="pq">{run?.pendingQuestion?.text ?? ""}</span>
    </div>
  );
}
```

Then add tests:

```tsx
  it("surfaces a pending question, then resumes to completed after answer", async () => {
    let resolveAnswer!: () => void;
    const answered = new Promise<void>((r) => (resolveAnswer = r));
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "ask_user", ask_id: "q1", text: "Which audience?", attachments: [] };
        await answered;
        yield { type: "turn_resumed" };
        yield { type: "turn_completed" };
        yield { type: "stream_end", task_status: "completed" };
      },
      async answer() {
        resolveAnswer();
      },
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));
    expect(screen.getByTestId("pq")).toHaveTextContent("Which audience?");

    fireEvent.click(screen.getByText("answer"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));
  });

  it("does not mark awaiting_input tasks failed when the stream stays open", async () => {
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "ask_user", ask_id: "q1", text: "?", attachments: [] };
        // stream ends here WITHOUT a terminal event — but task is awaiting_input
      },
    });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @ash/web exec vitest run src/components/workbench/__tests__/task-run-provider.test.tsx`
Expected: FAIL (`useAnswerTask`/`useAttachTask` not exported; awaiting_input still flips to failed on close).

- [ ] **Step 3: Extend the provider**

In `apps/web/src/components/workbench/task-run-provider.tsx`:

(a) Import the projector + history label resolution, and widen the context value:

```ts
import { historyToTask, type HistoryLabels } from "@/lib/praxis/history-projection";
```

Add to `TaskRunContextValue`:

```ts
  /** Answer the live pending question on a task (praxis ask_user). */
  answer(taskId: string, text: string): Promise<void>;
  /** Re-attach a task's stream: catch up via /history, then re-subscribe. */
  attach(taskId: string): Promise<void>;
```

(b) Extend `labels` (the `useMemo<ReducerLabels>`) with the two new fields and build `HistoryLabels`:

```ts
  const labels = useMemo<ReducerLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      failureNotice: (reason: string) => t("runtimeFailureNotice", { reason }),
      notifyMessage: (text: string) => text,
      truncationNotice: t("runtimeTruncationNotice"),
    }),
    [t],
  );
  const historyLabels = useMemo<HistoryLabels>(
    () => ({
      deckFallbackTitle: t("runtimeDeckFallbackTitle"),
      deckPreview: t("runtimeDeckPreview"),
      notifyMessage: (text: string) => text,
    }),
    [t],
  );
```

(c) Factor the stream loop into a reusable helper, drive termination off the **current** task status (so `stream_end` / terminal events win and `awaiting_input` is never auto-failed), and keep the abnormal-close fallback only for non-terminal, non-awaiting states. Replace the body of the fire-and-forget IIFE inside `startTask` (lines ~95-128) with a call to a shared `runStream`:

```ts
  const runStream = useCallback(
    async (taskId: string, initial: Task, controller: AbortController) => {
      const client = clientRef.current;
      let state = initialTaskRunState(initial);
      try {
        for await (const event of client.streamEvents(taskId, controller.signal)) {
          state = runtimeEventReducer(state, event, Date.now(), labels);
          upsert(state.task);
        }
        const status = state.task.status;
        if (status === "completed" || status === "failed") {
          try {
            await client.complete(taskId);
          } catch {
            // already terminal; ignore
          }
        } else if (status !== "awaiting_input") {
          // Abnormal close (no stream_end, not waiting on the user): fail it.
          upsert({ ...state.task, status: "failed" });
        }
        // awaiting_input: leave open; re-attach happens on demand.
      } catch {
        if (!controller.signal.aborted) {
          upsert({ ...state.task, status: "failed" });
        }
      } finally {
        controllersRef.current.delete(controller);
      }
    },
    [labels, upsert],
  );
```

In `startTask`, replace the IIFE with the following, and add `runStream` to `startTask`'s `useCallback` dependency array (currently `[upsert, labels]` → `[upsert, labels, runStream]`):

```ts
      const controller = new AbortController();
      controllersRef.current.add(controller);
      void (async () => {
        try {
          await clientRef.current.startTask(summary.id, directive);
          upsert({ ...seeded, status: "running" });
          await runStream(summary.id, { ...seeded, status: "running" }, controller);
        } catch {
          if (!controller.signal.aborted) upsert({ ...seeded, status: "failed" });
        }
      })();
```

(d) Add `answer` and `attach`:

```ts
  const answer = useCallback(
    async (taskId: string, text: string): Promise<void> => {
      const current = runs[taskId];
      const askId = current?.pendingQuestion?.askId;
      if (!askId) return; // no live question (or recovered read-only); nothing to send
      // Optimistic: clear the prompt and show running; the live turn_resumed confirms.
      const { pendingQuestion: _omit, ...rest } = current;
      upsert({ ...rest, status: "running" });
      try {
        await clientRef.current.answer(taskId, askId, text);
      } catch {
        upsert(current); // restore the question so the user can retry
      }
    },
    [runs, upsert],
  );

  const attach = useCallback(
    async (taskId: string): Promise<void> => {
      const client = clientRef.current;
      const existing = runs[taskId];
      if (!existing) return;
      try {
        // Page through history (newest-first), concatenate, project in bulk.
        const items: Awaited<ReturnType<typeof client.history>>["items"] = [];
        let cursor: string | undefined;
        do {
          const page = await client.history(taskId, cursor);
          items.push(...page.items);
          cursor = page.next_cursor ?? undefined;
        } while (cursor);
        const rebuilt = historyToTask(existing, items, historyLabels);
        upsert(rebuilt);
        const controller = new AbortController();
        controllersRef.current.add(controller);
        await runStream(taskId, rebuilt, controller);
      } catch {
        upsert({ ...existing, status: "failed" });
      }
    },
    [runs, historyLabels, upsert, runStream],
  );
```

(e) Add `answer` and `attach` to the `useMemo` context value and add the hooks at the bottom:

```ts
export function useAnswerTask(): (taskId: string, text: string) => Promise<void> {
  return useTaskRunContext().answer;
}

export function useAttachTask(): (taskId: string) => Promise<void> {
  return useTaskRunContext().attach;
}
```

- [ ] **Step 4: Add the i18n truncation notice key**

In `apps/web/messages/zh.json` Workbench namespace: `"runtimeTruncationNotice": "回复因达到长度上限被截断。"`
In `apps/web/messages/en.json` Workbench namespace: `"runtimeTruncationNotice": "Response was truncated (reached the max length)."`

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/components/workbench/__tests__/task-run-provider.test.tsx`
Expected: PASS (including the original "stream closes without a terminal event → failed" test, which has no `ask_user` so still fails as before).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(workbench): answer action, stream_end termination, history re-attach"
```

---

## Task 10: UI affordance — pending-question prompt in the chat

The visual/layout design is produced with the **frontend-design** skill during this task. The functional contract below is fixed; the design pass refines styling within `docs/design-guidelines.md` tokens (no rogue literals; ADR-0013/0014) and a11y rules.

**Files:**
- Create: `apps/web/src/components/workbench/chat/answer-prompt.tsx`
- Test: `apps/web/src/components/workbench/chat/__tests__/answer-prompt.test.tsx`
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx`
- Modify: `apps/web/src/components/workbench/workbench-app.tsx`
- Modify: `apps/web/messages/zh.json`, `apps/web/messages/en.json`

- [ ] **Step 1: Invoke frontend-design for the prompt component's visual treatment**

Use the `frontend-design` skill to design the `AnswerPrompt` card (question text + answer input + submit), honoring the design tokens and the a11y contract (focus moves to the input on appearance; `aria-live="polite"` announces the question). Keep the functional props/behavior in Step 3 exactly as specified.

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/workbench/chat/__tests__/answer-prompt.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { AnswerPrompt } from "../answer-prompt";

const messages = { Workbench: { answerPlaceholder: "Type your answer", answerSubmit: "Send", answerLabel: "Answer the question" } };

function renderPrompt(onAnswer = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AnswerPrompt question={{ askId: "q1", text: "Which audience?", attachments: [] }} onAnswer={onAnswer} />
    </NextIntlClientProvider>,
  );
  return onAnswer;
}

describe("AnswerPrompt", () => {
  it("renders the question text", () => {
    renderPrompt();
    expect(screen.getByText("Which audience?")).toBeInTheDocument();
  });

  it("submits the typed answer via onAnswer", () => {
    const onAnswer = renderPrompt();
    fireEvent.change(screen.getByLabelText("Answer the question"), { target: { value: "marketers" } });
    fireEvent.click(screen.getByText("Send"));
    expect(onAnswer).toHaveBeenCalledWith("marketers");
  });

  it("does not submit an empty answer", () => {
    const onAnswer = renderPrompt();
    fireEvent.click(screen.getByText("Send"));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @ash/web exec vitest run src/components/workbench/chat/__tests__/answer-prompt.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `AnswerPrompt`**

Create `apps/web/src/components/workbench/chat/answer-prompt.tsx` (structure fixed; visual classes refined by the frontend-design pass, tokens only):

```tsx
"use client";

import type { PendingQuestion } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export interface AnswerPromptProps {
  question: PendingQuestion;
  onAnswer: (text: string) => void;
}

/**
 * Renders a pending praxis `ask_user` question and captures the user's answer.
 * Functional contract per the interactive-execution spec; visual treatment
 * follows docs/design-guidelines.md tokens.
 */
export function AnswerPrompt({ question, onAnswer }: AnswerPromptProps) {
  const t = useTranslations("Workbench");
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus to the input when a question appears (a11y).
  useEffect(() => {
    inputRef.current?.focus();
  }, [question.askId, question.text]);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onAnswer(text);
    setValue("");
  };

  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
    >
      <p className="text-sm font-medium text-foreground">{question.text}</p>
      <div className="mt-2 flex items-end gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          aria-label={t("answerLabel")}
          placeholder={t("answerPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="button" variant="pill" size="sm" onClick={submit}>
          {t("answerSubmit")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @ash/web exec vitest run src/components/workbench/chat/__tests__/answer-prompt.test.tsx`
Expected: PASS.

- [ ] **Step 6: Add the i18n keys**

`apps/web/messages/zh.json` Workbench: `"answerPlaceholder": "输入你的回复…"`, `"answerSubmit": "发送"`, `"answerLabel": "回复问题"`.
`apps/web/messages/en.json` Workbench: `"answerPlaceholder": "Type your answer…"`, `"answerSubmit": "Send"`, `"answerLabel": "Answer the question"`.

- [ ] **Step 7: Thread the affordance through the chat + app**

In `apps/web/src/components/workbench/chat/workbench-chat.tsx`:
- Extend `WorkbenchChatProps` with `pendingQuestion?: PendingQuestion;` and `onAnswer?: (text: string) => void;` (import `PendingQuestion` from `@ash/shared`).
- In the JSX, just before the `active.status === "running"` thinking block, render the prompt when present:

```tsx
            {pendingQuestion && onAnswer && (
              <div className="message-bubble">
                <AnswerPrompt question={pendingQuestion} onAnswer={onAnswer} />
              </div>
            )}
```

- Add `import { AnswerPrompt } from "./answer-prompt";`.

In `apps/web/src/components/workbench/workbench-app.tsx`:
- Import the answer hook: `import { useAnswerTask, useTaskRun, useTaskRuns } from "./task-run-provider";`
- Get the action: `const answerTask = useAnswerTask();`
- On the live-task `<WorkbenchChat>` (the first one, around line 98), pass:

```tsx
          pendingQuestion={liveTask.pendingQuestion}
          onAnswer={(text) => void answerTask(liveTask.id, text)}
```

- [ ] **Step 8: Run the chat + app tests**

Run: `pnpm --filter @ash/web exec vitest run src/components/workbench`
Expected: PASS (existing chat/composer tests unaffected; new prompt path compiles).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/workbench/chat/answer-prompt.tsx apps/web/src/components/workbench/chat/__tests__/answer-prompt.test.tsx apps/web/src/components/workbench/chat/workbench-chat.tsx apps/web/src/components/workbench/workbench-app.tsx apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(workbench): render ask_user prompt + wire answer action"
```

---

## Task 11: Record decisions — ADR-0015 + supersession + component docs

**Files:**
- Create: `docs/adr/0015-praxis-0.1.5-interactive-execution.md`
- Modify: `docs/adr/0011-praxis-contract-and-live-task-execution.md` (status note)
- Modify: the chat component doc under `docs/components/` (whichever documents the chat pane payload)

- [ ] **Step 1: Write ADR-0015**

Create `docs/adr/0015-praxis-0.1.5-interactive-execution.md` following the existing ADR format (see `0012-praxis-live-transport.md`). Cover: Status (Accepted, 2026-06-13); Context (vendored contract was a pre-freeze draft; 0.1.5 adds interactive execution + history); Decision — (1) re-vendor to 0.1.5; (2) `RuntimeEvent`/`HistoryEvent` now generated, **superseding ADR-0011 §1** hand-mirror; (3) add `awaiting_input` + `pendingQuestion`, **relaxing ADR-0011 §5–6** (a task is not auto-completed while awaiting input); (4) same-session `/history` catch-up on re-attach, a **bounded exception to ADR-0011 §7** (still no ash-side persistence; catch-up reads praxis); (5) `stream_end` is the authoritative terminator; (6) deferred items (full reload reconnect, multi-turn, retry/backoff). Consequences + Related (ADR-0007/0011/0012, the spec).

- [ ] **Step 2: Add a supersession note to ADR-0011**

In `docs/adr/0011-praxis-contract-and-live-task-execution.md`, under `## Status`, append: `Partially superseded by ADR-0015 (2026-06-13): §1 hand-mirror (RuntimeEvent now generated), §5–6 (awaiting_input is non-terminal), §7 (same-session history catch-up).`

- [ ] **Step 3: Update the chat component doc**

Find the chat pane doc: `ls docs/components/` and edit the file documenting the chat payload (e.g. `chat.md`). Add a short subsection "Pending question (ask_user)": the chat renders an `AnswerPrompt` when the live task is `awaiting_input`; `pendingQuestion {askId,text,attachments}` + `onAnswer(text)` are passed as sidecar props (the adapted `Conversation` does not carry them); submitting routes to `answer(taskId, text)` → `POST /answers`. If no chat-specific doc exists, add the note to the most relevant components doc and reference ADR-0015.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0015-praxis-0.1.5-interactive-execution.md docs/adr/0011-praxis-contract-and-live-task-execution.md docs/components/
git commit -m "docs: ADR-0015 interactive execution + supersession + component docs"
```

---

## Task 12: Full verification + PR

**Files:** none (gates + PR)

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: PASS (no rogue-literal / ESLint violations).

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS across the workspace (shared types + web consumers all align).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Full test run**

Run: `pnpm --filter @ash/web exec vitest run`
Expected: PASS (all praxis, provider, chat, and status tests green).

- [ ] **Step 5: Push the branch and open the PR**

```bash
git push -u origin feat/praxis-0.1.5-interactive-execution
gh pr create --title "feat(praxis): 0.1.5 interactive execution (ask_user + history catch-up)" --body "$(cat <<'EOF'
## Summary
Upgrades the vendored praxis contract from a pre-freeze draft to 0.1.5 and adds interactive task execution: the agent can pause mid-turn with `ask_user`, the user answers, the turn resumes. Adds same-session `/history` catch-up on stream re-attach.

- Re-vendored 0.1.5 contract; regenerated types; `RuntimeEvent`/`HistoryEvent` now generated (hand-mirror retired)
- `awaiting_input` status + `pendingQuestion` on the Task model
- Reducer: ask_user / turn_resumed / notify_user / stream_end / stop_reason
- Pure `historyToTask` bulk projector; provider `answer` action + history re-attach
- `AnswerPrompt` chat affordance (visual design via frontend-design)
- ADR-0015; supersedes ADR-0011 §1, relaxes §5-7

## Test plan
- `pnpm lint && pnpm typecheck && pnpm build`
- `pnpm --filter @ash/web exec vitest run` (reducer, history projector, http client, fake run, provider, answer prompt)

Spec: `docs/superpowers/specs/2026-06-13-praxis-interactive-execution-design.md`
Plan: `docs/superpowers/plans/2026-06-13-praxis-interactive-execution.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created on `feat/praxis-0.1.5-interactive-execution`.

---

## Self-Review notes (for the executor)

- **Type consistency:** `PendingQuestion.askId` (camelCase, ash domain) vs. wire `ask_id`/`AnswerRequest.ask_id` (snake, praxis) — the reducer/projector translate at the seam; `client.answer(id, askId, answer)` posts `{ ask_id, answer }`. `ReducerLabels` gains `notifyMessage` + `truncationNotice`; `HistoryLabels` is a separate, smaller interface (no `failureNotice`/`truncationNotice`). The provider builds both from the same i18n catalog.
- **stream_end vs. fallback:** terminal mapping is authoritative; the "abnormal close → failed" fallback now fires only when status is neither terminal nor `awaiting_input`. The pre-existing provider test (no `ask_user`, no terminal event) still yields `failed`.
- **Backward-compat:** the fake's trailing `stream_end{completed}` is idempotent with `turn_completed`; the one-shot `fake-run` test still asserts `completed`.
- **i18n:** all new user-facing strings added to both `zh.json` and `en.json` (zh-CN is the product baseline); agent-output chunks in the fake stay out of catalogs (IMPL-3 / D-12).
