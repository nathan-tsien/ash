import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import { textOf } from "@ash/shared";
import { fakePraxisClient } from "../fake-client";
import {
  initialTaskRunState,
  runtimeEventReducer,
  type ReducerLabels,
} from "../runtime-event-reducer";

const labels: ReducerLabels = {
  failureNotice: (reason) => `Task failed: ${reason}`,
  truncationNotice: "Response was truncated.",
  askFallbackText: "待回答",
};

/**
 * Integration check: drive the fake client's event stream through the reducer
 * exactly as TaskRunProvider does, and assert the final Task. Verifies the whole
 * fake -> reducer pipeline end to end without a browser.
 */
describe("fake praxis run through reducer", () => {
  it("produces a completed task with assistant text and tool traces", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "生成一个 PPT", title: "生成一个 PPT" });
    expect(summary.status).toBe("draft");

    const seeded: Task = {
      id: summary.id,
      title: "生成一个 PPT",
      description: "生成一个 PPT",
      status: "running",
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
      messages: [
        {
          id: `user-${summary.id}`,
          role: "user",
          blocks: [{ kind: "text", text: "生成一个 PPT" }],
          createdAt: "2026-06-03T00:00:00.000Z",
        },
      ],
      deliverables: [],
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
    // Two assistant messages: m1 (text + tool_use) and m2 (tool_result + closing text).
    expect(assistant.length).toBeGreaterThanOrEqual(1);
    // isStreaming is absent (undefined) after message_stop — not false — so the
    // settled state is deep-equal to history projection output (A7 parity fix).
    expect(assistant[0].isStreaming).toBeUndefined();
    // The first assistant message should contain text blocks.
    const m1Text = textOf(assistant[0]);
    expect(m1Text.length).toBeGreaterThan(0);

    // slides.render tool_use (c1) + tool_result resolves to 1 success trace.
    // The interactive path also produces a message_ask_user trace. Non-interactive
    // run only has slides.render → 1 trace (or 2 if message_ask_user is absent).
    expect(task.toolTraces.length).toBeGreaterThanOrEqual(1);
    const slidesTrace = task.toolTraces.find((tr) => tr.toolName === "slides.render");
    expect(slidesTrace).toBeDefined();
    expect(slidesTrace!.status).toBe("success");
    // Args assembled from input_json_delta chunks: {"slides":8}
    expect(JSON.parse(slidesTrace!.input ?? "{}")).toEqual({ slides: 8 });

    // No synthesized artifact after stream_end: the retired placeholder deck is gone.
    // Deliverables come from agent_generated attachments on messages.
    expect(task.deliverables).toEqual([]);
  });
});

describe("fake praxis interactive run", () => {
  it("pauses on turn_paused, resumes after answer, and completes", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "ask me", title: "ask me" });
    const ev: string[] = [];

    // Run state to detect turn_paused and answer.
    const seeded: Task = {
      id: summary.id,
      title: "ask me",
      description: "",
      status: "running",
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
      messages: [],
      deliverables: [],
      toolTraces: [],
    };
    let state = initialTaskRunState(seeded);
    let now = 1000;

    for await (const e of fakePraxisClient.streamEvents(summary.id)) {
      ev.push(e.type);
      now += 100;
      state = runtimeEventReducer(state, e, now, labels);
      if (e.type === "turn_paused") {
        // The pending question is set by turn_paused via the message_ask_user block.
        expect(state.task.status).toBe("awaiting_input");
        // Answer to unblock the stream.
        await fakePraxisClient.answer(summary.id, "q1", "yes");
      }
    }

    expect(ev).toContain("turn_paused");
    expect(ev).toContain("turn_resumed");
    expect(ev.indexOf("turn_resumed")).toBeGreaterThan(ev.indexOf("turn_paused"));
    expect(ev.at(-1)).toBe("stream_end");
    expect(state.task.status).toBe("completed");
  });

  it("history() returns ascending (oldest-first) committed blocks with no next_before_seq", async () => {
    const summary = await fakePraxisClient.createTask({ user_input: "x", title: "x" });
    const page = await fakePraxisClient.history(summary.id);
    expect(Array.isArray(page.items)).toBe(true);
    // next_before_seq absent (last page) — should be undefined or absent.
    expect(page.next_before_seq ?? undefined).toBeUndefined();
  });
});
