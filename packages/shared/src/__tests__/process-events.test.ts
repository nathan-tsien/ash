import { describe, expect, it } from "vitest";
import { processEvents } from "../process-events";
import type { AshContentBlock, Message } from "../types";

const ASK = "message_ask_user";

const msg = (id: string, blocks: AshContentBlock[], at = "2026-06-28T00:00:00Z"): Message => ({
  id,
  role: "assistant",
  blocks,
  createdAt: at,
});

describe("processEvents", () => {
  it("resolves a tool call by callId from running to success", () => {
    const events = processEvents(
      [
        msg("m1", [{ kind: "tool_use", callId: "c1", toolName: "web_search", args: {} }]),
        msg("m2", [{ kind: "tool_result", callId: "c1", ok: true }]),
      ],
      { askToolName: ASK },
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: "c1", kind: "tool", label: "web_search", status: "success", messageId: "m1" });
  });

  it("marks a failed tool_result as error", () => {
    const events = processEvents(
      [
        msg("m1", [{ kind: "tool_use", callId: "c1", toolName: "run", args: {} }]),
        msg("m2", [{ kind: "tool_result", callId: "c1", ok: false, detail: "boom" }]),
      ],
      { askToolName: ASK },
    );
    expect(events[0]).toMatchObject({ id: "c1", status: "error" });
  });

  it("classifies the ask tool as an ask event with info status", () => {
    const events = processEvents(
      [msg("m1", [{ kind: "tool_use", callId: "a1", toolName: ASK, args: {} }])],
      { askToolName: ASK },
    );
    expect(events[0]).toMatchObject({ id: "a1", kind: "ask", status: "info" });
  });

  it("preserves first-seen order across calls", () => {
    const events = processEvents(
      [
        msg("m1", [
          { kind: "tool_use", callId: "c1", toolName: "first", args: {} },
          { kind: "tool_use", callId: "c2", toolName: "second", args: {} },
        ]),
      ],
      { askToolName: ASK },
    );
    expect(events.map((e) => e.id)).toEqual(["c1", "c2"]);
  });

  it("appends a terminal done event when provided", () => {
    const events = processEvents(
      [msg("m1", [{ kind: "tool_use", callId: "c1", toolName: "run", args: {} }])],
      { askToolName: ASK, done: { status: "success", at: "2026-06-28T01:00:00Z", label: "Completed" } },
    );
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ id: "__done__", kind: "done", status: "success", label: "Completed" });
  });

  it("returns [] for no blocks and no done", () => {
    expect(processEvents([msg("m1", [])], { askToolName: ASK })).toEqual([]);
  });
});
