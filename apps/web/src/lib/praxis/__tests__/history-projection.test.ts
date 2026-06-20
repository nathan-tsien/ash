import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import { textOf } from "@ash/shared";
import type { PraxisMessage } from "../runtime-events";
import { historyToTask, type HistoryLabels } from "../history-projection";

const labels: HistoryLabels = {
  deckFallbackTitle: "Presentation",
  deckPreview: "preview",
  askFallbackText: "待回答",
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

/**
 * Build an ascending (oldest-first) PraxisMessage[] from a chronological list of
 * message specs — the praxis 0.4.0 page order. Each spec carries role + content
 * blocks; seq is assigned chronologically.
 */
function msgs(
  specs: Array<{ role: "user" | "assistant"; content: PraxisMessage["content"] }>,
): PraxisMessage[] {
  return specs.map((s, i) => ({
    id: `m${i}`,
    task_id: "t1",
    seq: i,
    role: s.role,
    created_at: `2026-06-13T00:00:0${i}.000Z`,
    content: s.content,
  }));
}

describe("historyToTask", () => {
  it("returns the seed unchanged for an empty page", () => {
    expect(historyToTask(seed(), [], labels).messages).toHaveLength(0);
  });

  it("projects messages in chronological order from ascending (oldest-first) items", () => {
    const task = historyToTask(
      seed(),
      msgs([
        { role: "user", content: [{ type: "text", data: { text: "生成 PPT" } }] },
        { role: "assistant", content: [{ type: "text", data: { text: "好的" } }] },
      ]),
      labels,
    );
    expect(task.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(textOf(task.messages[1])).toBe("好的");
  });

  it("maps a tool_use + tool_result pair across messages to a success tool trace", () => {
    // Represent a tool_use in the first (assistant) message and a tool_result in
    // a second (assistant) message — tracesFromBlocks reconciles across messages.
    const task = historyToTask(
      seed(),
      msgs([
        {
          role: "assistant",
          content: [
            { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: { theme: "x" } } },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "tool_result", data: { call_id: "c1", ok: true } }],
        },
      ]),
      labels,
    );
    expect(task.toolTraces).toHaveLength(1);
    expect(task.toolTraces[0].status).toBe("success");
  });

  it("an unanswered message_ask_user tool_use block sets pendingQuestion with askId = call_id", () => {
    const task = historyToTask(
      seed(),
      msgs([
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "Which audience?" } },
            },
          ],
        },
      ]),
      labels,
    );
    expect(task.status).toBe("awaiting_input");
    expect(task.pendingQuestion).toEqual({ askId: "q1", text: "Which audience?", attachments: [] });
  });
});

describe("historyToTask — optimistic user-message reconcile", () => {
  function seedWithOptimistic(text: string): Task {
    return {
      ...seed(),
      messages: [
        {
          id: "user-t1",
          role: "user",
          blocks: [{ kind: "text", text }],
          createdAt: "2026-06-13T00:00:00.000Z",
          clientId: "user-t1",
        },
      ],
    };
  }

  it("reconciles the persisted user message into the optimistic bubble in place", () => {
    const task = historyToTask(
      seedWithOptimistic("你是谁"),
      msgs([{ role: "user", content: [{ type: "text", data: { text: "你是谁" } }] }]),
      labels,
    );
    // One bubble, not two: the optimistic seed is reused, not appended.
    expect(task.messages).toHaveLength(1);
    // Same id keeps the React key stable; clientId dropped so it matches once.
    expect(task.messages[0].id).toBe("user-t1");
    expect(task.messages[0].clientId).toBeUndefined();
  });

  it("reconciles even when persisted content differs only by surrounding whitespace", () => {
    const task = historyToTask(
      seedWithOptimistic("你是谁"),
      msgs([{ role: "user", content: [{ type: "text", data: { text: "  你是谁\n" } }] }]),
      labels,
    );
    expect(task.messages).toHaveLength(1);
    expect(task.messages[0].id).toBe("user-t1");
    expect(task.messages[0].clientId).toBeUndefined();
  });

  it("reconciles repeated identical turns to their own seed in order", () => {
    // Optimistic ids are client-prefixed (never equal praxis ids m0/m1…), so the
    // id-keyed path does not fire — reconcile is by trimmed text, in order.
    const base: Task = {
      ...seed(),
      messages: [
        { id: "local-1", role: "user", blocks: [{ kind: "text", text: "ok" }], createdAt: "2026-06-13T00:00:00.000Z", clientId: "local-1" },
        { id: "local-2", role: "user", blocks: [{ kind: "text", text: "ok" }], createdAt: "2026-06-13T00:00:01.000Z", clientId: "local-2" },
      ],
    };
    const task = historyToTask(
      base,
      msgs([
        { role: "user", content: [{ type: "text", data: { text: "ok" } }] },
        { role: "user", content: [{ type: "text", data: { text: "ok" } }] },
      ]),
      labels,
    );
    // Both seeds reconciled, none appended; ids preserved in order.
    expect(task.messages.map((m) => m.id)).toEqual(["local-1", "local-2"]);
    expect(task.messages.every((m) => m.clientId === undefined)).toBe(true);
  });

  it("appends a fresh message when there is no optimistic seed to match", () => {
    const task = historyToTask(
      seed(),
      msgs([{ role: "user", content: [{ type: "text", data: { text: "no seed here" } }] }]),
      labels,
    );
    expect(task.messages).toHaveLength(1);
    expect(task.messages[0].clientId).toBeUndefined();
  });
});

describe("historyToTask — id-keyed dedupe on re-attach", () => {
  // On re-attach the seed already holds live-streamed messages keyed by their
  // stable praxis id; the same ids come back from /history. They MUST reconcile
  // in place (not append a duplicate id → duplicate React key).
  it("reconciles a persisted assistant message by stable id instead of duplicating", () => {
    const base: Task = {
      ...seed(),
      messages: [
        {
          id: "m0",
          role: "assistant",
          blocks: [{ kind: "text", text: "partial" }],
          createdAt: "2026-06-13T00:00:00.000Z",
          isStreaming: true,
        },
      ],
    };
    const task = historyToTask(
      base,
      msgs([{ role: "assistant", content: [{ type: "text", data: { text: "final answer" } }] }]),
      labels,
    );
    expect(task.messages.filter((m) => m.id === "m0")).toHaveLength(1);
    expect(textOf(task.messages.find((m) => m.id === "m0")!)).toBe("final answer");
    // Authoritative history message replaces the streaming seed (no isStreaming).
    expect(task.messages.find((m) => m.id === "m0")!.isStreaming).toBeUndefined();
  });
});
