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
  /** Fallback deck title when the task has none (artifact filename base). */
  deckFallbackTitle: string;
  /** Placeholder preview text for the synthesized deck artifact. */
  deckPreview: string;
  /** Builds an assistant message from a praxis notify_user event. */
  notifyMessage: (text: string) => string;
}

export function historyToTask(seed: Task, items: HistoryItem[], labels: HistoryLabels): Task {
  // praxis returns newest-first; fold in chronological order.
  const chronological = [...items].reverse();
  let task: Task = {
    ...seed,
    messages: [...seed.messages],
    toolTraces: [...seed.toolTraces],
    artifacts: [...seed.artifacts],
  };
  // Track tool_use start timestamps by call_id to compute durationMs on tool_result.
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
      return pushMessage(task, makeMessage("user", String(event.content ?? ""), ts, task));

    case "assistant_message":
      return pushMessage(task, makeMessage("assistant", event.text, ts, task));

    case "thinking":
      // Reasoning channel not surfaced (parity with the live reducer).
      return task;

    case "notify_user":
      return pushMessage(
        task,
        makeMessage("assistant", labels.notifyMessage(event.text), ts, task),
      );

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
      // Historical ask_user has no ask_id; project as read-only pending question
      // (empty askId). The live re-subscribe will re-emit it with the real id.
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
      // Tolerate unknown variants — the union only grows.
      return task;
  }
}

function makeMessage(role: Message["role"], content: string, ts: string, task: Task): Message {
  return {
    id: `hist-${task.id}-${role}-${task.messages.length}`,
    role,
    content,
    createdAt: ts,
  };
}

function pushMessage(task: Task, msg: Message): Task {
  return { ...task, messages: [...task.messages, msg] };
}

// TODO(ash): replace synthesized artifact with praxis task_outputs mapping when
// praxis Sprint 3d ships output artifacts (mirrors the note in runtime-event-reducer.ts).
function synthesizeArtifact(task: Task, ts: string, labels: HistoryLabels): Artifact {
  const base = (task.title || labels.deckFallbackTitle).replace(/\.pptx$/i, "");
  return {
    id: `artifact-${task.id}-deck`,
    kind: "document",
    title: `${base}.pptx`,
    preview: labels.deckPreview,
    updatedAt: ts,
  };
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
