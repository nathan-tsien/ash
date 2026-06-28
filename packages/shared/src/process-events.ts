import type { Message, ProcessEvent, ProcessEventStatus } from "./types";

/**
 * Normalize a conversation's message blocks into a navigable process timeline:
 * one event per tool call (running/success/error), one per unresolved ask, and a
 * terminal "done" when provided. Pure; mirrors tracesFromBlocks' callId keying so
 * online/history parity holds. `askToolName` is injected to avoid coupling
 * packages/shared to the app's praxis constants.
 */
export function processEvents(
  messages: Message[],
  opts: { askToolName: string; done?: { status: "success" | "error"; at: string; label: string } },
): ProcessEvent[] {
  const order: string[] = [];
  const byId = new Map<string, ProcessEvent>();
  const put = (id: string, ev: ProcessEvent) => {
    if (!byId.has(id)) order.push(id);
    byId.set(id, ev);
  };
  for (const m of messages) {
    for (const b of m.blocks) {
      if (b.kind === "tool_use") {
        const prev = byId.get(b.callId);
        const isAsk = b.toolName === opts.askToolName;
        put(b.callId, {
          id: b.callId,
          kind: isAsk ? "ask" : "tool",
          label: b.toolName,
          status: prev?.status ?? (isAsk ? "info" : "running"),
          at: prev?.at ?? m.createdAt,
          messageId: prev?.messageId ?? m.id,
        });
      } else if (b.kind === "tool_result") {
        const prev = byId.get(b.callId);
        const status: ProcessEventStatus = b.ok ? "success" : "error";
        put(b.callId, {
          id: b.callId,
          kind: prev?.kind ?? "tool",
          label: prev?.label ?? b.callId,
          status,
          at: prev?.at ?? m.createdAt,
          messageId: prev?.messageId ?? m.id,
        });
      }
    }
  }
  const events = order.map((id) => byId.get(id)!);
  if (opts.done) {
    events.push({ id: "__done__", kind: "done", label: opts.done.label, status: opts.done.status, at: opts.done.at });
  }
  return events;
}
