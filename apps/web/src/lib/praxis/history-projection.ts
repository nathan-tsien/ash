import type { Message, Task } from "@ash/shared";
import { deliverablesFromMessages, textOf } from "@ash/shared";
import type { MessagePage, PraxisMessage } from "./runtime-events";
import { pendingQuestionFromMessages, praxisBlockToAsh } from "./block-fold";
import { attachmentsToAsh } from "./attachments";
import { tracesFromBlocks } from "./tool-trace";

/**
 * Bulk projection of a task's persisted `/history` page (praxis 0.4.0
 * `MessagePage`, ascending / oldest-first) into ash's `Task` view-model
 * (ADR-0018, reordered by ADR-0019). Pure and deterministic.
 *
 * History returns complete `Message` objects (typed `ContentBlock[]`), so this is
 * a near-identity map: each praxis Message becomes a view Message, tool traces are
 * derived from the blocks, and an unanswered `message_ask_user` tool block becomes
 * the pending question. The provider rebuilds from history, then subscribes for
 * live block deltas; the two do not overlap.
 */
export interface HistoryLabels {
  /** Shown as the question text when a message_ask_user block carries none. */
  askFallbackText: string;
}

export function historyToTask(seed: Task, items: PraxisMessage[], labels: HistoryLabels): Task {
  // praxis 0.4.0: each /history page is ascending (oldest-first) and the caller
  // prepends older pages, so `items` already arrives chronological — fold as-is
  // (oldest-first) to keep the optimistic-message reconcile order stable.
  let messages = [...seed.messages];
  for (const pm of items) {
    messages = reconcileOrAppend(messages, praxisMessageToView(pm));
  }
  const pending = pendingQuestionFromMessages(messages, labels.askFallbackText);
  return {
    ...seed,
    messages,
    toolTraces: tracesFromBlocks(messages),
    deliverables: deliverablesFromMessages(messages),
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
    ...(attachmentsToAsh(pm.attachments) ? { attachments: attachmentsToAsh(pm.attachments) } : {}),
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

