import type { Artifact, Message, Task, ToolTrace } from "@ash/shared";
import type { RuntimeEvent } from "./runtime-events";
import { serializeDetail, summarizeArgs, upsertToolTrace } from "./tool-trace";

/**
 * Folds the praxis SSE `RuntimeEvent` stream into ash's `Task` view-model.
 *
 * Pure and deterministic: timestamps are derived from the injected `nowMs` and
 * ids from a monotonic `seq`, so there is no `Date.now()`/`Math.random()` here
 * and the reducer is fully unit-testable. The provider supplies `Date.now()`.
 *
 * This is the single place the praxis wire shape meets the UI model. When praxis
 * revises the contract, change the reducer (and `runtime-events.ts`) only.
 *
 * App-authored, user-facing copy (artifact placeholders, failure notices) is
 * injected via `ReducerLabels` rather than hardcoded, so the reducer stays pure
 * and i18n-clean (IMPL-3). The provider resolves these from next-intl catalogs.
 */
export interface TaskRunState {
  task: Task;
  currentAssistantId: string | null;
  toolStartMs: Record<string, number>;
  seq: number;
}

/** User-facing strings the reducer renders, resolved by the caller from i18n. */
export interface ReducerLabels {
  /** Fallback deck title when the task has none (artifact filename base). */
  deckFallbackTitle: string;
  /** Placeholder preview text for the synthesized deck artifact. */
  deckPreview: string;
  /** Builds the user-facing failure notice from the praxis reason. */
  failureNotice: (reason: string) => string;
  /** Builds an assistant message from a praxis notify_user event. */
  notifyMessage: (text: string) => string;
  /** Notice appended when a turn completed with stop_reason "max_tokens". */
  truncationNotice: string;
}

export function initialTaskRunState(task: Task): TaskRunState {
  return { task, currentAssistantId: null, toolStartMs: {}, seq: 0 };
}

const iso = (ms: number): string => new Date(ms).toISOString();

// TODO(ash): replace synthesized artifact with praxis task_outputs mapping when
// praxis Sprint 3d ships output artifacts. praxis currently emits no artifact
// event, so ash synthesizes a placeholder deck on turn completion.
function synthesizePptArtifact(task: Task, nowMs: number, labels: ReducerLabels): Artifact {
  const base = (task.title || labels.deckFallbackTitle).replace(/\.pptx$/i, "");
  return {
    id: `artifact-${task.id}-deck`,
    kind: "document",
    title: `${base}.pptx`,
    preview: labels.deckPreview,
    updatedAt: iso(nowMs),
  };
}

export function runtimeEventReducer(
  state: TaskRunState,
  event: RuntimeEvent,
  nowMs: number,
  labels: ReducerLabels,
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
        // Full serialized args for the expandable trace detail. praxis emits no
        // live tool output, so `result` is populated only from /history.
        input: serializeDetail(event.args),
        status: "running",
        startedAt: iso(nowMs),
      };
      return {
        ...state,
        toolStartMs: { ...state.toolStartMs, [event.call_id]: nowMs },
        task: { ...task, toolTraces: upsertToolTrace(task.toolTraces, trace), updatedAt: iso(nowMs) },
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
          // Upsert the single synthesized deck: a multi-turn task (follow-ups)
          // sees several turn_completed events; appending the fixed-id artifact
          // each time produces duplicate React keys. See history-projection.ts.
          artifacts: upsertArtifact(task.artifacts, artifact),
          status: "completed",
          completedAt: iso(nowMs),
          updatedAt: iso(nowMs),
        },
      };
    }

    case "turn_failed": {
      const finalized = finalizeStreaming(task.messages, state.currentAssistantId);
      // Surface the failure reason to the user instead of silently dropping it.
      const notice: Message = {
        id: `assistant-${task.id}-fail-${state.seq}`,
        role: "assistant",
        content: labels.failureNotice(event.reason),
        createdAt: iso(nowMs),
      };
      return {
        ...state,
        currentAssistantId: null,
        seq: state.seq + 1,
        task: {
          ...task,
          messages: [...finalized, notice],
          status: "failed",
          updatedAt: iso(nowMs),
        },
      };
    }

    case "turn_cancelled":
      return patch(state, { status: "failed", updatedAt: iso(nowMs) });

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

    default:
      return state;
  }
}

/** Replace an artifact with the same id, else append. Keeps deck ids unique. */
function upsertArtifact(artifacts: Artifact[], next: Artifact): Artifact[] {
  const i = artifacts.findIndex((a) => a.id === next.id);
  if (i === -1) return [...artifacts, next];
  const copy = [...artifacts];
  copy[i] = next;
  return copy;
}

function patch(state: TaskRunState, fields: Partial<Task>): TaskRunState {
  return { ...state, task: { ...state.task, ...fields } };
}

function finalizeStreaming(messages: Message[], id: string | null): Message[] {
  if (!id) return messages;
  return messages.map((m) => (m.id === id ? { ...m, isStreaming: false } : m));
}
