import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import { fakePraxisClient } from "../fake-client";
import {
  initialTaskRunState,
  runtimeEventReducer,
  type ReducerLabels,
} from "../runtime-event-reducer";

const labels: ReducerLabels = {
  deckFallbackTitle: "Presentation",
  deckPreview: "preview",
  failureNotice: (reason) => `Task failed: ${reason}`,
  notifyMessage: (text) => text,
  truncationNotice: "Response was truncated.",
};

/**
 * Integration check: drive the fake client's event stream through the reducer
 * exactly as TaskRunProvider does, and assert the final Task. Verifies the whole
 * fake -> reducer pipeline end to end without a browser.
 */
describe("fake praxis run through reducer", () => {
  it("produces a completed task with assistant text, tool traces, and a synthesized artifact", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "生成一个 PPT", title: "生成一个 PPT" });
    expect(summary.status).toBe("draft");

    const seeded: Task = {
      id: summary.id,
      title: "生成一个 PPT",
      description: "生成一个 PPT",
      status: "running",
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
      messages: [{ id: `user-${summary.id}`, role: "user", content: "生成一个 PPT", createdAt: "2026-06-03T00:00:00.000Z" }],
      artifacts: [],
      toolTraces: [],
    };

    let state = initialTaskRunState(seeded);
    let now = 1000;
    for await (const event of fakePraxisClient.streamEvents(summary.id)) {
      now += 100;
      state = runtimeEventReducer(state, event, now, labels);
    }

    const { task } = state;
    expect(task.status).toBe("completed");

    const assistant = task.messages.filter((m) => m.role === "assistant");
    expect(assistant).toHaveLength(1);
    expect(assistant[0].isStreaming).toBe(false);
    expect(assistant[0].content.length).toBeGreaterThan(0);

    expect(task.toolTraces).toHaveLength(2);
    expect(task.toolTraces.every((tr) => tr.status === "success")).toBe(true);
    expect(task.toolTraces.every((tr) => typeof tr.durationMs === "number")).toBe(true);

    expect(task.artifacts).toHaveLength(1);
    expect(task.artifacts[0].title).toContain(".pptx");
  });
});

describe("fake praxis interactive run", () => {
  it("pauses on ask_user, resumes after answer, and completes", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "ask me", title: "ask me" });
    const ev: string[] = [];

    for await (const e of fakePraxisClient.streamEvents(summary.id)) {
      ev.push(e.type);
      if (e.type === "ask_user") {
        await fakePraxisClient.answer(summary.id, (e as { ask_id: string }).ask_id, "yes");
      }
    }

    expect(ev).toContain("ask_user");
    expect(ev.indexOf("turn_resumed")).toBeGreaterThan(ev.indexOf("ask_user"));
    expect(ev.at(-1)).toBe("stream_end");
  });

  it("history() returns newest-first committed blocks", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "x", title: "x" });
    const page = await fakePraxisClient.history(summary.id);
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.next_cursor ?? null).toBeNull();
  });
});
