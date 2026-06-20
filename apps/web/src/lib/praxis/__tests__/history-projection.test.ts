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

  it("projects a user_message carrying a content-block array", () => {
    // praxis history sends user_message.content as a list of content blocks,
    // not a bare string: [{ type: "text", data: { text } }].
    const task = historyToTask(
      seed(),
      items([
        {
          type: "user_message",
          content: [{ type: "text", data: { text: "你是什么模型？" } }],
        } as HistoryItem["event"],
      ]),
      labels,
    );
    expect(task.messages).toHaveLength(1);
    expect(task.messages[0].role).toBe("user");
    expect(task.messages[0].content).toBe("你是什么模型？");
  });

  it("synthesizes a single deck artifact across multiple turn_completed events", () => {
    const task = historyToTask(
      seed(),
      items([
        { type: "user_message", content: "q1" },
        { type: "assistant_message", text: "a1" },
        { type: "turn_completed" },
        { type: "user_message", content: "q2" },
        { type: "assistant_message", text: "a2" },
        { type: "turn_completed" },
      ]),
      labels,
    );
    // One deck per task, not one per turn — duplicate ids crash React's key check.
    expect(task.artifacts).toHaveLength(1);
    const ids = task.artifacts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
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

describe("historyToTask — optimistic user-message reconcile", () => {
  function seedWithOptimistic(content: string): Task {
    return {
      ...seed(),
      messages: [
        {
          id: "user-t1",
          role: "user",
          content,
          createdAt: "2026-06-13T00:00:00.000Z",
          clientId: "user-t1",
        },
      ],
    };
  }

  it("reconciles the persisted user_message into the optimistic bubble in place", () => {
    const task = historyToTask(
      seedWithOptimistic("你是谁"),
      items([{ type: "user_message", content: "你是谁" }]),
      labels,
    );
    // One bubble, not two: the optimistic seed is reused, not appended.
    expect(task.messages).toHaveLength(1);
    // Same id keeps the React key stable; clientId is dropped so it matches once.
    expect(task.messages[0].id).toBe("user-t1");
    expect(task.messages[0].clientId).toBeUndefined();
  });

  it("reconciles even when persisted content differs only by surrounding whitespace", () => {
    // praxis may normalize/trim the stored text; matching must tolerate that or
    // the very duplicate this dedupe exists to prevent reappears.
    const task = historyToTask(
      seedWithOptimistic("你是谁"),
      items([{ type: "user_message", content: "  你是谁\n" }]),
      labels,
    );
    expect(task.messages).toHaveLength(1);
    expect(task.messages[0].id).toBe("user-t1");
    expect(task.messages[0].clientId).toBeUndefined();
  });

  it("reconciles repeated identical turns to their own seed in order", () => {
    const base: Task = {
      ...seed(),
      messages: [
        { id: "m1", role: "user", content: "ok", createdAt: "2026-06-13T00:00:00.000Z", clientId: "c1" },
        { id: "m2", role: "user", content: "ok", createdAt: "2026-06-13T00:00:01.000Z", clientId: "c2" },
      ],
    };
    const task = historyToTask(
      base,
      items([
        { type: "user_message", content: "ok" },
        { type: "user_message", content: "ok" },
      ]),
      labels,
    );
    // Both seeds reconciled, none appended; ids preserved in order.
    expect(task.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(task.messages.every((m) => m.clientId === undefined)).toBe(true);
  });

  it("appends a fresh message when there is no optimistic seed to match", () => {
    const task = historyToTask(
      seed(),
      items([{ type: "user_message", content: "no seed here" }]),
      labels,
    );
    expect(task.messages).toHaveLength(1);
    expect(task.messages[0].clientId).toBeUndefined();
  });
});
