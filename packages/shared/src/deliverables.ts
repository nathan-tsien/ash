import type { Deliverable, Message } from "./types";

/**
 * Project agent-produced deliverables from a conversation's message attachments.
 * Keeps only `source === "agent_generated"`, dedupes by attachment id (first-seen
 * wins), and preserves order — so the live reducer and /history projection yield
 * identical lists (parity, mirroring tracesFromBlocks).
 */
export function deliverablesFromMessages(messages: Message[]): Deliverable[] {
  const order: string[] = [];
  const byId = new Map<string, Deliverable>();
  for (const m of messages) {
    for (const a of m.attachments ?? []) {
      if (a.source !== "agent_generated") continue;
      if (byId.has(a.id)) continue;
      order.push(a.id);
      byId.set(a.id, {
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uri: a.uri,
        kind: a.kind,
      });
    }
  }
  return order.map((id) => byId.get(id)!);
}
