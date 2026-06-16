import type { Artifact, Message, Task, ToolTrace } from "@ash/shared";
import type { HistoryEvent, HistoryItem } from "./runtime-events";
import { serializeDetail, summarizeArgs, upsertToolTrace } from "./tool-trace";

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
      return reconcileUserMessage(task, extractText(event.content), ts);

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
        input: serializeDetail(event.args),
        status: "running",
        startedAt: ts,
      };
      return { ...task, toolTraces: upsertToolTrace(task.toolTraces, trace) };
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
              // Persisted history carries tool output; surface it in the detail.
              result: serializeDetail(event.ok ? event.output : event.error_message),
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
      // A task has at most ONE synthesized deck. A multi-turn history carries
      // several turn_completed events; appending a fixed-id artifact each time
      // produces duplicate React keys. Upsert so the deck stays single and its
      // timestamp tracks the latest turn.
      return {
        ...task,
        status: "completed",
        completedAt: ts,
        artifacts: upsertArtifact(task.artifacts, synthesizeArtifact(task, ts, labels)),
      };

    case "turn_failed":
      return { ...task, status: "failed" };

    default:
      // Tolerate unknown variants — the union only grows.
      return task;
  }
}

/**
 * Flatten a praxis `user_message.content` into plain text. praxis sends content
 * as a list of typed blocks (`[{ type: "text", data: { text } }]`), not a bare
 * string. Tolerates a legacy bare-string payload and unknown block shapes.
 */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const data = (block as { data?: { text?: unknown } })?.data;
        return typeof data?.text === "string" ? data.text : "";
      })
      .join("");
  }
  return "";
}

/** Replace an artifact with the same id, else append. Keeps deck ids unique. */
function upsertArtifact(artifacts: Artifact[], next: Artifact): Artifact[] {
  const i = artifacts.findIndex((a) => a.id === next.id);
  if (i === -1) return [...artifacts, next];
  const copy = [...artifacts];
  copy[i] = next;
  return copy;
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

/**
 * Project a persisted `user_message` while de-duplicating against an optimistic
 * bubble. The provider seeds the just-sent user message with a stable `clientId`;
 * when history replays that same turn we reconcile the seed IN PLACE — keeping its
 * id (and thus its React key) and only authoritatively setting content/createdAt —
 * instead of appending a fresh `hist-*` message. This removes both the visible
 * duplicate and the key churn that could otherwise re-key (and momentarily hide)
 * the live bubble. Matching is by an unreconciled optimistic message (carries a
 * `clientId`) with content equal after trimming — praxis may normalize/trim the
 * persisted text, and an exact compare would miss it and re-introduce the very
 * duplicate this dedupe prevents. The first such match wins, so repeated
 * identical turns each reconcile their own seed in order.
 */
function reconcileUserMessage(task: Task, content: string, ts: string): Task {
  const target = content.trim();
  const i = task.messages.findIndex(
    (m) => m.role === "user" && m.clientId !== undefined && m.content.trim() === target,
  );
  if (i === -1) {
    return pushMessage(task, makeMessage("user", content, ts, task));
  }
  const messages = [...task.messages];
  // Drop clientId on reconcile so this seed is matched at most once.
  const prev = { ...messages[i] };
  delete prev.clientId;
  messages[i] = { ...prev, role: "user", content, createdAt: ts };
  return { ...task, messages };
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
