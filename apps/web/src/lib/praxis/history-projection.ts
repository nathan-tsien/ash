import type { Artifact, Message, Task } from "@ash/shared";
import { textOf } from "@ash/shared";
import type { MessagePage, PraxisMessage } from "./runtime-events";
import { pendingQuestionFromMessages, praxisBlockToAsh } from "./block-fold";
import { tracesFromBlocks } from "./tool-trace";

/**
 * Bulk projection of a task's persisted `/history` page (praxis 0.3.0
 * `MessagePage`, newest-first) into ash's `Task` view-model (ADR-0018). Pure and
 * deterministic.
 *
 * History returns complete `Message` objects (typed `ContentBlock[]`), so this is
 * a near-identity map: each praxis Message becomes a view Message, tool traces are
 * derived from the blocks, and an unanswered `message_ask_user` tool block becomes
 * the pending question. The provider rebuilds from history, then subscribes for
 * live block deltas; the two do not overlap.
 */
export interface HistoryLabels {
  /** Fallback deck title when the task has none (artifact filename base). */
  deckFallbackTitle: string;
  /** Placeholder preview text for the synthesized deck artifact. */
  deckPreview: string;
  /** Shown as the question text when a message_ask_user block carries none. */
  askFallbackText: string;
}

export function historyToTask(seed: Task, items: PraxisMessage[], labels: HistoryLabels): Task {
  // praxis returns newest-first (across all paged items); fold oldest-first so
  // the optimistic-message reconcile order is stable.
  const chronological = [...items].reverse();
  let messages = [...seed.messages];
  let latestTs = seed.updatedAt;
  for (const pm of chronological) {
    messages = reconcileOrAppend(messages, praxisMessageToView(pm));
    if (pm.created_at) latestTs = pm.created_at;
  }
  const pending = pendingQuestionFromMessages(messages, labels.askFallbackText);
  const artifacts =
    seed.status === "completed"
      ? upsertArtifact(seed.artifacts, synthesizeArtifact(seed, latestTs, labels))
      : seed.artifacts;
  return {
    ...seed,
    messages,
    toolTraces: tracesFromBlocks(messages),
    artifacts,
    ...(pending ? { status: "awaiting_input" as const, pendingQuestion: pending } : {}),
  };
}

/** Cursor to fetch the next (older) page; absent on the last page. */
export function nextBeforeSeq(page: MessagePage): number | undefined {
  return page.next_before_seq;
}

function praxisMessageToView(pm: PraxisMessage): Message {
  return {
    id: pm.id,
    role: pm.role === "user" ? "user" : "assistant",
    blocks: (pm.content ?? []).map(praxisBlockToAsh),
    createdAt: pm.created_at,
    stopReason: pm.stop_reason,
  };
}

/**
 * Append a projected message, or reconcile a persisted user message into a
 * matching optimistic bubble (same trimmed text, carries a `clientId`) IN PLACE —
 * keeping the optimistic id (React key) and dropping `clientId` so it matches at
 * most once. Prevents a duplicate user bubble when /history replays a just-sent
 * turn (PR #37 dedupe, re-expressed on the block model via `textOf`).
 */
function reconcileOrAppend(messages: Message[], incoming: Message): Message[] {
  // Stable praxis id already present (re-attach, or a repeated /history page):
  // replace in place with the authoritative history message — keeps the React
  // key and prevents a duplicate-id collision against a live-streamed bubble.
  const byId = messages.findIndex((m) => m.id === incoming.id);
  if (byId !== -1) {
    const copy = [...messages];
    copy[byId] = incoming;
    return copy;
  }
  if (incoming.role === "user") {
    const target = textOf(incoming).trim();
    const i = messages.findIndex(
      (m) => m.role === "user" && m.clientId !== undefined && textOf(m).trim() === target,
    );
    if (i !== -1) {
      const copy = [...messages];
      const prev = { ...copy[i] };
      delete prev.clientId;
      copy[i] = { ...prev, blocks: incoming.blocks, createdAt: incoming.createdAt };
      return copy;
    }
  }
  return [...messages, incoming];
}

/** Replace an artifact with the same id, else append. Keeps deck ids unique. */
function upsertArtifact(artifacts: Artifact[], next: Artifact): Artifact[] {
  const i = artifacts.findIndex((a) => a.id === next.id);
  if (i === -1) return [...artifacts, next];
  const copy = [...artifacts];
  copy[i] = next;
  return copy;
}

// TODO(ash): replace the synthesized placeholder deck with praxis task_outputs
// when that contract ships (mirrors the note in runtime-event-reducer.ts).
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
