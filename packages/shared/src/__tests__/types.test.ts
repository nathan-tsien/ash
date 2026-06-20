import { describe, expect, it } from "vitest";
import { textOf, type Message } from "../types";

describe("textOf", () => {
  it("joins multiple text blocks in order", () => {
    const msg: Message = {
      id: "m1",
      role: "assistant",
      blocks: [
        { kind: "text", text: "Hello, " },
        { kind: "text", text: "world!" },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(textOf(msg)).toBe("Hello, world!");
  });

  it("ignores non-text blocks (thinking, tool_use)", () => {
    const msg: Message = {
      id: "m2",
      role: "assistant",
      blocks: [
        { kind: "thinking", text: "Internal reasoning..." },
        { kind: "text", text: "The answer is 42." },
        { kind: "tool_use", callId: "c1", toolName: "search", args: { q: "test" } },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(textOf(msg)).toBe("The answer is 42.");
  });

  it("returns empty string for a message with no text blocks", () => {
    const msg: Message = {
      id: "m3",
      role: "assistant",
      blocks: [
        { kind: "tool_result", callId: "c1", ok: true },
        { kind: "image", alt: "a photo" },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(textOf(msg)).toBe("");
  });
});
