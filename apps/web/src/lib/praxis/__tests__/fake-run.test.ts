import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import { fakePraxisClient } from "../fake-client";
import { initialTaskRunState, runtimeEventReducer } from "../runtime-event-reducer";

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
      state = runtimeEventReducer(state, event, now);
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
