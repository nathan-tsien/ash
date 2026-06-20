import { describe, expect, it } from "vitest";
import type { AshContentBlock } from "@ash/shared";
import type { ContentBlock } from "../runtime-events";
import { applyDelta, finalizeToolArgs, praxisBlockToAsh } from "../block-fold";

describe("praxisBlockToAsh", () => {
  it("maps a text block", () => {
    const b = { type: "text", data: { text: "hi" } } satisfies ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "text", text: "hi" });
  });
  it("maps a thinking block, preserving redacted", () => {
    const b = { type: "thinking", data: { text: "hmm", redacted: true } } satisfies ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "thinking", text: "hmm", redacted: true });
  });
  it("maps a tool_use block (args defaults to {} before assembly)", () => {
    const b = { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: {} } } satisfies ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "tool_use", callId: "c1", toolName: "slides.render", args: {} });
  });
  it("maps a successful tool_result, lifting text content into detail", () => {
    const b = { type: "tool_result", data: { call_id: "c1", ok: true, content: [{ type: "text", data: { text: "done" } }] } } satisfies ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "tool_result", callId: "c1", ok: true, detail: "done" });
  });
  it("maps a failed tool_result, lifting error_message into detail", () => {
    const b = { type: "tool_result", data: { call_id: "c1", ok: false, error_message: "boom" } } satisfies ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "tool_result", callId: "c1", ok: false, detail: "boom" });
  });
  it("maps an image block to a stub (alt only, per ADR-0018 deferral)", () => {
    const b = { type: "image", data: { source: { type: "url", url: "x" } } } as unknown as ContentBlock;
    expect(praxisBlockToAsh(b)).toEqual({ kind: "image" });
  });
});

describe("applyDelta", () => {
  it("text_delta appends to a text block", () => {
    const block: AshContentBlock = { kind: "text", text: "Hel" };
    const { block: out } = applyDelta(block, { type: "text_delta", text: "lo" }, "");
    expect(out).toEqual({ kind: "text", text: "Hello" });
  });
  it("thinking_delta appends to a thinking block", () => {
    const block: AshContentBlock = { kind: "thinking", text: "a" };
    const { block: out } = applyDelta(block, { type: "thinking_delta", thinking: "b" }, "");
    expect(out).toEqual({ kind: "thinking", text: "ab" });
  });
  it("input_json_delta accumulates jsonAcc and leaves the block unchanged", () => {
    const block: AshContentBlock = { kind: "tool_use", callId: "c", toolName: "x", args: {} };
    const step1 = applyDelta(block, { type: "input_json_delta", partial_json: '{"a":' }, "");
    const step2 = applyDelta(step1.block, { type: "input_json_delta", partial_json: "1}" }, step1.jsonAcc);
    expect(step2.block).toEqual(block);
    expect(finalizeToolArgs(step2.jsonAcc)).toEqual({ a: 1 });
  });
});

describe("finalizeToolArgs", () => {
  it("returns {} on empty or malformed json", () => {
    expect(finalizeToolArgs("")).toEqual({});
    expect(finalizeToolArgs('{"a":')).toEqual({});
  });
  it("parses a complete json object", () => {
    expect(finalizeToolArgs('{"theme":"x"}')).toEqual({ theme: "x" });
  });
});
