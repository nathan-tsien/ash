import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import {
  initialTaskRunState,
  runtimeEventReducer,
  type ReducerLabels,
  type TaskRunState,
} from "../runtime-event-reducer";
import type { RuntimeEvent } from "../runtime-events";

const labels: ReducerLabels = {
  deckFallbackTitle: "Presentation",
  deckPreview: "preview",
  failureNotice: (reason) => `Task failed: ${reason}`,
};

function seed(): TaskRunState {
  const task: Task = {
    id: "t1",
    title: "生成 PPT",
    description: "生成 PPT",
    status: "pending",
    createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
    messages: [
      { id: "u1", role: "user", content: "生成 PPT", createdAt: "2026-06-03T00:00:00.000Z" },
    ],
    artifacts: [],
    toolTraces: [],
  };
  return initialTaskRunState(task);
}

const run = (s: TaskRunState, evs: RuntimeEvent[], now = 1000): TaskRunState =>
  evs.reduce((acc, ev) => runtimeEventReducer(acc, ev, now, labels), s);

describe("runtimeEventReducer", () => {
  it("turn_started marks the task running", () => {
    expect(run(seed(), [{ type: "turn_started" }]).task.status).toBe("running");
  });

  it("text_delta accumulates into a streaming assistant message", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "text_delta", chunk: "你好" },
      { type: "text_delta", chunk: "世界" },
    ]);
    const last = s.task.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.content).toBe("你好世界");
    expect(last.isStreaming).toBe(true);
  });

  it("tool dispatch start/end yields a closed trace with duration", () => {
    let s = runtimeEventReducer(
      seed(),
      { type: "tool_dispatch_started", call_id: "c1", tool_name: "slides.render", args: { theme: "minimal" } },
      1000,
      labels,
    );
    s = runtimeEventReducer(s, { type: "tool_dispatch_ended", call_id: "c1", ok: true }, 1500, labels);
    const tr = s.task.toolTraces.at(-1)!;
    expect(tr.toolName).toBe("slides.render");
    expect(tr.status).toBe("success");
    expect(tr.durationMs).toBe(500);
    expect(tr.summary).toContain("theme");
  });

  it("tool end with ok=false marks the trace error", () => {
    let s = runtimeEventReducer(
      seed(),
      { type: "tool_dispatch_started", call_id: "c1", tool_name: "x", args: {} },
      1000,
      labels,
    );
    s = runtimeEventReducer(
      s,
      { type: "tool_dispatch_ended", call_id: "c1", ok: false, error_message: "boom" },
      1100,
      labels,
    );
    const tr = s.task.toolTraces.at(-1)!;
    expect(tr.status).toBe("error");
    expect(tr.summary).toBe("boom");
  });

  it("turn_completed finalizes the message, synthesizes an artifact, completes the task", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "text_delta", chunk: "done" },
      { type: "turn_completed" },
    ]);
    expect(s.task.status).toBe("completed");
    expect(s.task.completedAt).toBeDefined();
    expect(s.task.messages.at(-1)!.isStreaming).toBe(false);
    expect(s.task.artifacts).toHaveLength(1);
    expect(s.task.artifacts[0].kind).toBe("document");
    expect(s.task.artifacts[0].title).toContain(".pptx");
    // Injected i18n labels render rather than hardcoded copy (IMPL-3).
    expect(s.task.artifacts[0].preview).toBe("preview");
  });

  it("falls back to the injected deck title when the task has none", () => {
    let s = initialTaskRunState({ ...seed().task, title: "" });
    s = run(s, [{ type: "turn_started" }, { type: "turn_completed" }]);
    expect(s.task.artifacts[0].title).toBe("Presentation.pptx");
  });

  it("turn_failed surfaces the reason and does not synthesize an artifact", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "text_delta", chunk: "partial" },
      { type: "turn_failed", reason: "model timeout" },
    ]);
    expect(s.task.status).toBe("failed");
    expect(s.task.artifacts).toHaveLength(0);
    // The partial assistant message is finalized (no longer streaming).
    const partial = s.task.messages.find((m) => m.content === "partial");
    expect(partial?.isStreaming).toBe(false);
    // The failure reason is surfaced to the user via the injected label (IMPL-3).
    expect(s.task.messages.at(-1)!.content).toBe("Task failed: model timeout");
  });

  it("turn_cancelled maps to failed", () => {
    const s = run(seed(), [{ type: "turn_started" }, { type: "turn_cancelled" }]);
    expect(s.task.status).toBe("failed");
  });

  it("turn_paused / turn_resumed do not change status", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "turn_paused" },
      { type: "turn_resumed" },
    ]);
    expect(s.task.status).toBe("running");
  });

  it("ignores thinking_delta and skill_activation_requested", () => {
    const s = run(seed(), [
      { type: "turn_started" },
      { type: "thinking_delta", chunk: "hmm" },
      { type: "skill_activation_requested", skill_name: "deck" },
    ]);
    expect(s.task.messages.filter((m) => m.role === "assistant")).toHaveLength(0);
  });
});
