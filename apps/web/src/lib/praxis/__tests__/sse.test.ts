import { describe, expect, it } from "vitest";
import { SseParser } from "../sse";

describe("SseParser", () => {
  it("parses a single complete frame", () => {
    const p = new SseParser();
    expect(p.push('data: {"type":"turn_started"}\n\n')).toEqual(['{"type":"turn_started"}']);
  });

  it("buffers a frame split across chunks", () => {
    const p = new SseParser();
    expect(p.push('data: {"type":"text_')).toEqual([]);
    expect(p.push('delta","chunk":"hi"}\n\n')).toEqual(['{"type":"text_delta","chunk":"hi"}']);
  });

  it("emits multiple frames from one chunk", () => {
    const p = new SseParser();
    expect(p.push("data: a\n\ndata: b\n\n")).toEqual(["a", "b"]);
  });

  it("concatenates multiple data lines with a newline", () => {
    const p = new SseParser();
    expect(p.push("data: line1\ndata: line2\n\n")).toEqual(["line1\nline2"]);
  });

  it("ignores comment/heartbeat lines and frames with no data", () => {
    const p = new SseParser();
    expect(p.push(': keep-alive\n\ndata: {"type":"turn_completed"}\n\n')).toEqual([
      '{"type":"turn_completed"}',
    ]);
  });

  it("normalizes CRLF line endings", () => {
    const p = new SseParser();
    expect(p.push("data: x\r\n\r\n")).toEqual(["x"]);
  });
});
