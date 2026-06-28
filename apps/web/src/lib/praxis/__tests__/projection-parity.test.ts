/**
 * Projection-parity test (A7): the SAME praxis turn must produce an equivalent
 * ash Message (blocks, order, role, createdAt, stopReason) and toolTraces
 * whether it was built live via the runtime-event reducer or projected from the
 * persisted /history MessagePage.
 *
 * A visual "jump" occurs when the live stream ends and the provider replaces the
 * streamed state with history: if the two paths diverge, the UI re-renders
 * unnecessarily and may flash. This test locks the settled (post-message_stop)
 * state to be deep-equal.
 *
 * Path-specific fields explicitly excluded from the comparison (documented here):
 *  - `updatedAt` on Task: the reducer bumps it on every event; history uses the
 *    message's created_at. They serve different operational concerns.
 *  - `task.status` / `task.completedAt`: stream_end drives those transitions for
 *    the live path; in history the seed task carries the terminal status already.
 *    Not relevant to the per-message / per-trace parity we are testing.
 *  - `task.deliverables`: derived from messages on both paths; covered by a separate
 *    assertion below (they must agree when messages carry agent_generated attachments).
 */
import { describe, expect, it } from "vitest";
import type { Task } from "@ash/shared";
import type { PraxisMessage, StreamEvent } from "../runtime-events";
import { initialTaskRunState, runtimeEventReducer, type ReducerLabels, type TaskRunState } from "../runtime-event-reducer";
import { historyToTask, type HistoryLabels } from "../history-projection";

// ---------------------------------------------------------------------------
// Shared labels (identical in both paths so label text cannot be the source of
// any divergence).
// ---------------------------------------------------------------------------
const reducerLabels: ReducerLabels = {
  failureNotice: (reason) => `Task failed: ${reason}`,
  truncationNotice: "（输出因长度限制被截断）",
  askFallbackText: "请补充信息",
};
const historyLabels: HistoryLabels = {
  askFallbackText: "请补充信息",
};

const NOW = Date.parse("2026-06-20T10:00:00.000Z");
const MSG_CREATED_AT = "2026-06-20T10:00:01.000Z";

// ---------------------------------------------------------------------------
// Seed task — running, no messages yet.
// ---------------------------------------------------------------------------
function seedTask(): Task {
  return {
    id: "t1",
    title: "生成 PPT",
    description: "生成 PPT",
    status: "running",
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    messages: [],
    deliverables: [],
    toolTraces: [],
  };
}

// ---------------------------------------------------------------------------
// Fixture: one assistant turn with three blocks:
//   0 — thinking  ("let me plan...")
//   1 — text      ("Here is my plan:")
//   2 — tool_use  (call_id "c1", slides.render, args {theme: "dark"})
// … plus a second message carrying the tool_result for c1.
//
// This covers the full mixed-block scenario specified in the brief.
// ---------------------------------------------------------------------------

// --- LIVE path: realistic StreamEvent sequence --------------------------------

function run(state: TaskRunState, ...events: StreamEvent[]): TaskRunState {
  return events.reduce((s, e) => runtimeEventReducer(s, e, NOW, reducerLabels), state);
}

function buildLiveTask(): Task {
  // First assistant message: thinking + text + tool_use
  let s = run(
    initialTaskRunState(seedTask()),
    {
      type: "message_start",
      message: {
        id: "m1",
        task_id: "t1",
        seq: 1,
        role: "assistant",
        created_at: MSG_CREATED_AT,
      },
    } as StreamEvent,
    // Block 0: thinking
    { type: "content_block_start", index: 0, content_block: { type: "thinking", data: { text: "" } } } as StreamEvent,
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "let me " } } as StreamEvent,
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "plan..." } } as StreamEvent,
    { type: "content_block_stop", index: 0 } as StreamEvent,
    // Block 1: text
    { type: "content_block_start", index: 1, content_block: { type: "text", data: { text: "" } } } as StreamEvent,
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "Here is " } } as StreamEvent,
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "my plan:" } } as StreamEvent,
    { type: "content_block_stop", index: 1 } as StreamEvent,
    // Block 2: tool_use assembled from input_json_delta
    {
      type: "content_block_start",
      index: 2,
      content_block: { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: {} } },
    } as StreamEvent,
    { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '{"theme":' } } as StreamEvent,
    { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '"dark"}' } } as StreamEvent,
    { type: "content_block_stop", index: 2 } as StreamEvent,
    { type: "message_delta", stop_reason: "end_turn" } as StreamEvent,
    { type: "message_stop" } as StreamEvent,
  );

  // Second message: tool_result for c1
  s = run(
    s,
    {
      type: "message_start",
      message: {
        id: "m2",
        task_id: "t1",
        seq: 2,
        role: "assistant",
        created_at: MSG_CREATED_AT,
      },
    } as StreamEvent,
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "tool_result", data: { call_id: "c1", ok: true, content: [{ type: "text", data: { text: "rendered" } }] } },
    } as StreamEvent,
    { type: "content_block_stop", index: 0 } as StreamEvent,
    { type: "message_delta", stop_reason: "end_turn" } as StreamEvent,
    { type: "message_stop" } as StreamEvent,
  );

  return s.task;
}

// --- HISTORY path: PraxisMessage[] projection --------------------------------

function buildHistoryTask(): Task {
  const items: PraxisMessage[] = [
    {
      id: "m1",
      task_id: "t1",
      seq: 1,
      role: "assistant",
      created_at: MSG_CREATED_AT,
      stop_reason: "end_turn",
      content: [
        { type: "thinking", data: { text: "let me plan..." } },
        { type: "text", data: { text: "Here is my plan:" } },
        { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: { theme: "dark" } } },
      ],
    },
    {
      id: "m2",
      task_id: "t1",
      seq: 2,
      role: "assistant",
      created_at: MSG_CREATED_AT,
      stop_reason: "end_turn",
      content: [
        { type: "tool_result", data: { call_id: "c1", ok: true, content: [{ type: "text", data: { text: "rendered" } }] } },
      ],
    },
  ];
  return historyToTask(seedTask(), items, historyLabels);
}

// ---------------------------------------------------------------------------
// Helpers for structural comparison (excluding legitimately path-specific
// Task-level fields: updatedAt, status, completedAt, artifacts).
// ---------------------------------------------------------------------------

/**
 * Extract only the per-message fields relevant to parity (blocks, role,
 * createdAt, stopReason). Excludes `isStreaming` because:
 *  - The reducer historically sets it to `false` on message_stop.
 *  - History omits it (undefined) since completed messages are never streaming.
 *  Both correctly mean "not streaming"; this field is UI-only and never persisted.
 *  NOTE: after the A7 fix, `isStreaming` MUST be absent (undefined) on both paths.
 *        The assertion below enforces that.
 */
function comparableMessage(m: { id: string; role: string; blocks: unknown[]; createdAt: string; stopReason?: string; isStreaming?: boolean }) {
  return {
    id: m.id,
    role: m.role,
    blocks: m.blocks,
    createdAt: m.createdAt,
    stopReason: m.stopReason,
  };
}

describe("projection-parity (A7): live reducer vs history produce equivalent settled state", () => {
  it("both paths produce the same number of messages", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    expect(live.messages).toHaveLength(hist.messages.length);
  });

  it("message blocks, role, createdAt, and stopReason are deep-equal across both paths", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();

    expect(live.messages.map(comparableMessage)).toEqual(hist.messages.map(comparableMessage));
  });

  it("m1 thinking block text is identical", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    const lm1 = live.messages.find((m) => m.id === "m1")!;
    const hm1 = hist.messages.find((m) => m.id === "m1")!;
    expect(lm1.blocks[0]).toEqual(hm1.blocks[0]);
  });

  it("m1 text block text is identical", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    const lm1 = live.messages.find((m) => m.id === "m1")!;
    const hm1 = hist.messages.find((m) => m.id === "m1")!;
    expect(lm1.blocks[1]).toEqual(hm1.blocks[1]);
  });

  it("m1 tool_use block (including streamed args) is identical", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    const lm1 = live.messages.find((m) => m.id === "m1")!;
    const hm1 = hist.messages.find((m) => m.id === "m1")!;
    expect(lm1.blocks[2]).toEqual(hm1.blocks[2]);
  });

  it("m2 tool_result block is identical", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    const lm2 = live.messages.find((m) => m.id === "m2")!;
    const hm2 = hist.messages.find((m) => m.id === "m2")!;
    expect(lm2.blocks[0]).toEqual(hm2.blocks[0]);
  });

  it("toolTraces are deep-equal across both paths", () => {
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    expect(live.toolTraces).toEqual(hist.toolTraces);
  });

  it("isStreaming is absent (undefined) on settled messages in BOTH paths — no post-stream visual jump", () => {
    // After message_stop, a message must NOT carry isStreaming: false — it must
    // be absent (undefined) so deep comparison with history (which never sets it)
    // is stable. This is the core A7 invariant.
    const live = buildLiveTask();
    const hist = buildHistoryTask();
    for (const m of live.messages) {
      expect(m.isStreaming).toBeUndefined();
    }
    for (const m of hist.messages) {
      expect(m.isStreaming).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Deliverables parity: live and history agree on deliverables when a message
// carries an agent_generated attachment.
// ---------------------------------------------------------------------------

describe("projection-parity — deliverables from agent_generated attachment", () => {
  const ATTACHMENT = {
    id: "att-1",
    name: "slides.pptx",
    mime_type: "application/vnd.ms-powerpoint",
    size_bytes: 1024,
    uri: "/v1/tasks/t1/attachments/att-1",
    kind: "file" as const,
    source: "agent_generated" as const,
  };

  function buildLiveWithAttachment(): Task {
    // message_start carries the attachment on the message envelope.
    const s = run(
      initialTaskRunState(seedTask()),
      {
        type: "message_start",
        message: {
          id: "m1",
          task_id: "t1",
          seq: 1,
          role: "assistant",
          created_at: MSG_CREATED_AT,
          attachments: [ATTACHMENT],
        },
      } as StreamEvent,
      { type: "content_block_start", index: 0, content_block: { type: "text", data: { text: "" } } } as StreamEvent,
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Done." } } as StreamEvent,
      { type: "content_block_stop", index: 0 } as StreamEvent,
      { type: "message_delta", stop_reason: "end_turn" } as StreamEvent,
      { type: "message_stop" } as StreamEvent,
    );
    return s.task;
  }

  function buildHistoryWithAttachment(): Task {
    const items: PraxisMessage[] = [
      {
        id: "m1",
        task_id: "t1",
        seq: 1,
        role: "assistant",
        created_at: MSG_CREATED_AT,
        stop_reason: "end_turn",
        content: [{ type: "text", data: { text: "Done." } }],
        attachments: [ATTACHMENT],
      },
    ];
    return historyToTask(seedTask(), items, historyLabels);
  }

  it("deliverables are deep-equal across live and history paths when message has an agent_generated attachment", () => {
    const live = buildLiveWithAttachment();
    const hist = buildHistoryWithAttachment();
    expect(live.deliverables).toEqual(hist.deliverables);
    expect(live.deliverables).toHaveLength(1);
    expect(live.deliverables[0]).toMatchObject({
      id: "att-1",
      name: "slides.pptx",
      mimeType: "application/vnd.ms-powerpoint",
      sizeBytes: 1024,
      uri: "/v1/tasks/t1/attachments/att-1",
      kind: "file",
    });
  });

  it("message with agent_generated attachment has attachments field on both paths", () => {
    const live = buildLiveWithAttachment();
    const hist = buildHistoryWithAttachment();
    const lm1 = live.messages.find((m) => m.id === "m1")!;
    const hm1 = hist.messages.find((m) => m.id === "m1")!;
    expect(lm1.attachments).toEqual(hm1.attachments);
    expect(lm1.attachments).toHaveLength(1);
    expect(lm1.attachments![0]).toMatchObject({
      id: "att-1",
      name: "slides.pptx",
      mimeType: "application/vnd.ms-powerpoint",
      source: "agent_generated",
    });
  });
});
