import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import type { StreamEvent } from "../runtime-events";
import {
  initialTaskRunState,
  runtimeEventReducer,
  type ReducerLabels,
  type TaskRunState,
} from "../runtime-event-reducer";

const NOW = Date.parse("2026-06-20T00:00:00.000Z");

const labels: ReducerLabels = {
  failureNotice: (reason) => `Task failed: ${reason}`,
  truncationNotice: "（输出因长度限制被截断）",
  askFallbackText: "请补充信息",
};

function seedTask(): Task {
  return {
    id: "t1",
    title: "生成 PPT",
    description: "生成 PPT",
    status: "running",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    messages: [],
    deliverables: [],
    toolTraces: [],
  };
}

function praxisMsg(id: string, role: "user" | "assistant"): StreamEvent {
  return {
    type: "message_start",
    message: { id, task_id: "t1", seq: 1, role, created_at: "2026-06-20T00:00:01.000Z" },
  } as StreamEvent;
}

function run(state: TaskRunState, ...events: StreamEvent[]): TaskRunState {
  return events.reduce((s, e) => runtimeEventReducer(s, e, NOW, labels), state);
}

describe("runtimeEventReducer — 0.3.0 block stream", () => {
  it("message_start opens a streaming assistant message", () => {
    const s = run(initialTaskRunState(seedTask()), praxisMsg("m1", "assistant"));
    expect(s.task.messages).toHaveLength(1);
    expect(s.task.messages[0]).toMatchObject({ id: "m1", role: "assistant", isStreaming: true, blocks: [] });
    expect(s.currentMessageId).toBe("m1");
  });

  it("builds a text block from content_block_start + text_delta + stop", () => {
    const s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "text", data: { text: "" } } } as StreamEvent,
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "你好" } } as StreamEvent,
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "世界" } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
    );
    expect(s.task.messages.at(-1)!.blocks).toEqual([{ kind: "text", text: "你好世界" }]);
  });

  it("assembles tool_use args from input_json_delta on content_block_stop and derives a running trace", () => {
    const s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: {} } } } as StreamEvent,
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"theme":' } } as StreamEvent,
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '"x"}' } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
    );
    const block = s.task.messages.at(-1)!.blocks[0];
    expect(block).toMatchObject({ kind: "tool_use", callId: "c1", args: { theme: "x" } });
    expect(s.task.toolTraces).toHaveLength(1);
    expect(s.task.toolTraces[0]).toMatchObject({ id: "c1", toolName: "slides.render", status: "running" });
  });

  it("resolves a tool trace to success when a tool_result block arrives in a later message", () => {
    let s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "c1", tool_name: "x", args: {} } } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
      { type: "message_stop" } as StreamEvent,
    );
    s = run(
      s,
      praxisMsg("m2", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "tool_result", data: { call_id: "c1", ok: true, content: [{ type: "text", data: { text: "done" } }] } } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
    );
    expect(s.task.toolTraces).toHaveLength(1);
    expect(s.task.toolTraces[0]).toMatchObject({ id: "c1", status: "success", result: "done" });
  });

  it("message_stop clears isStreaming (to undefined, matching history projection); max_tokens appends a truncation notice", () => {
    const s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "message_delta", stop_reason: "max_tokens" } as StreamEvent,
      { type: "message_stop" } as StreamEvent,
    );
    // isStreaming must be absent (undefined) after message_stop so the settled
    // message is deep-equal to what history projection produces (A7 parity).
    expect(s.task.messages[0].isStreaming).toBeUndefined();
    expect(s.task.messages.at(-1)!.blocks).toEqual([{ kind: "text", text: labels.truncationNotice }]);
  });

  it("turn_paused sets pendingQuestion from a message_ask_user tool_use block", () => {
    const s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "ask-1", tool_name: "message_ask_user", args: { question: "哪个受众？" } } } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
      { type: "turn_paused" } as StreamEvent,
    );
    expect(s.task.status).toBe("awaiting_input");
    expect(s.task.pendingQuestion).toEqual({ askId: "ask-1", text: "哪个受众？", attachments: [] });
  });

  it("turn_resumed clears the pending question and resumes running", () => {
    let s = run(
      initialTaskRunState(seedTask()),
      praxisMsg("m1", "assistant"),
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "ask-1", tool_name: "message_ask_user", args: { question: "q" } } } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
      { type: "turn_paused" } as StreamEvent,
    );
    s = run(s, { type: "turn_resumed" } as StreamEvent);
    expect(s.task.status).toBe("running");
    expect(s.task.pendingQuestion).toBeUndefined();
  });

  it("stream_end completed marks the task complete (no synthesized artifact)", () => {
    const s = run(initialTaskRunState(seedTask()), praxisMsg("m1", "assistant"), { type: "stream_end", task_status: "completed" } as StreamEvent);
    expect(s.task.status).toBe("completed");
    expect(s.task.deliverables).toEqual([]);
    expect(s.task.completedAt).toBeDefined();
  });

  it("stream_end failed appends a failure notice and marks the task failed", () => {
    const s = run(initialTaskRunState(seedTask()), praxisMsg("m1", "assistant"), { type: "stream_end", task_status: "failed" } as StreamEvent);
    expect(s.task.status).toBe("failed");
    expect(s.task.messages.at(-1)!.blocks[0]).toEqual({ kind: "text", text: "Task failed: failed" });
  });

  it("upserts a message_start for an existing id instead of duplicating (re-emit on subscribe)", () => {
    let s = run(initialTaskRunState(seedTask()), praxisMsg("m1", "assistant"));
    // praxis may re-emit in-flight state on (re)subscribe; the same message id
    // must reconcile, not append a second bubble with a duplicate React key.
    s = run(s, praxisMsg("m1", "assistant"));
    expect(s.task.messages.filter((m) => m.id === "m1")).toHaveLength(1);
  });

  it("ping is a no-op", () => {
    const before = run(initialTaskRunState(seedTask()), praxisMsg("m1", "assistant"));
    const after = runtimeEventReducer(before, { type: "ping" } as StreamEvent, NOW, labels);
    expect(after).toEqual(before);
  });
});
