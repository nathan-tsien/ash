import type { Artifact, Message, Task, ToolTrace } from "@ash/shared";
import type { RuntimeEvent } from "./runtime-events";

/**
 * Folds the praxis SSE `RuntimeEvent` stream into ash's `Task` view-model.
 *
 * Pure and deterministic: timestamps are derived from the injected `nowMs` and
 * ids from a monotonic `seq`, so there is no `Date.now()`/`Math.random()` here
 * and the reducer is fully unit-testable. The provider supplies `Date.now()`.
 *
 * This is the single place the praxis wire shape meets the UI model. When praxis
 * revises the contract, change the reducer (and `runtime-events.ts`) only.
 */
export interface TaskRunState {
  task: Task;
  currentAssistantId: string | null;
  toolStartMs: Record<string, number>;
  seq: number;
}

export function initialTaskRunState(task: Task): TaskRunState {
  return { task, currentAssistantId: null, toolStartMs: {}, seq: 0 };
}

const iso = (ms: number): string => new Date(ms).toISOString();

// TODO(ash): replace synthesized artifact with praxis task_outputs mapping when
// praxis Sprint 3d ships output artifacts. praxis currently emits no artifact
// event, so ash synthesizes a placeholder deck on turn completion.
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
      let next = state;
      let id = state.currentAssistantId;
      let messages = task.messages;
      if (!id) {
        id = `assistant-${task.id}-${state.seq}`;
        const msg: Message = {
          id,
          role: "assistant",
          content: "",
          createdAt: iso(nowMs),
          isStreaming: true,
        };
        messages = [...messages, msg];
        next = { ...state, currentAssistantId: id, seq: state.seq + 1 };
      }
      const updated = messages.map((m) =>
        m.id === id ? { ...m, content: m.content + event.chunk } : m,
      );
      return { ...next, task: { ...task, messages: updated, updatedAt: iso(nowMs) } };
    }

    case "thinking_delta":
    case "skill_activation_requested":
      // Not surfaced this slice (optional reasoning/skill channels).
      return state;

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
        task: {
          ...task,
          messages: finalizeStreaming(task.messages, state.currentAssistantId),
          status: "failed",
          updatedAt: iso(nowMs),
        },
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
    const record = args as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0) {
      return keys
        .map((k) => `${k}: ${String(record[k])}`)
        .join(", ")
        .slice(0, 120);
    }
  }
  return "";
}
