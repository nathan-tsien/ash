import { describe, expect, it } from "vitest";
import type { ToolTrace } from "@ash/shared";
import { serializeDetail, summarizeArgs, upsertToolTrace } from "../tool-trace";

function trace(id: string, over: Partial<ToolTrace> = {}): ToolTrace {
  return {
    id,
    toolName: "slides.render",
    summary: "",
    status: "running",
    startedAt: "2026-06-13T00:00:00.000Z",
    ...over,
  };
}

describe("upsertToolTrace", () => {
  it("appends a trace with a new call id", () => {
    const out = upsertToolTrace([trace("c1")], trace("c2"));
    expect(out.map((t) => t.id)).toEqual(["c1", "c2"]);
  });

  it("replaces in place a trace with the same call id (no duplicate row)", () => {
    // On /history re-attach the seed already holds the live trace; folding the
    // same call_id must update the row, not duplicate the timeline entry.
    const out = upsertToolTrace([trace("c1", { status: "running" })], trace("c1", { status: "success", durationMs: 12 }));
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe("success");
    expect(out[0].durationMs).toBe(12);
  });

  it("does not mutate the input array", () => {
    const input = [trace("c1")];
    upsertToolTrace(input, trace("c1", { status: "success" }));
    expect(input[0].status).toBe("running");
  });
});

describe("summarizeArgs", () => {
  it("renders an object as a compact key: value line", () => {
    expect(summarizeArgs({ theme: "x", count: 3 })).toBe("theme: x, count: 3");
  });

  it("caps the summary length so wide payloads don't blow out the row", () => {
    const summary = summarizeArgs({ blob: "a".repeat(500) });
    expect(summary.length).toBe(120);
  });

  it("returns an empty string for empty or non-object args", () => {
    expect(summarizeArgs({})).toBe("");
    expect(summarizeArgs(undefined)).toBe("");
    expect(summarizeArgs("nope")).toBe("");
  });
});

describe("serializeDetail", () => {
  it("pretty-prints an object as JSON", () => {
    expect(serializeDetail({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("passes a non-empty string through unchanged", () => {
    expect(serializeDetail("hello")).toBe("hello");
  });

  it("returns undefined for absent or empty payloads", () => {
    expect(serializeDetail(undefined)).toBeUndefined();
    expect(serializeDetail(null)).toBeUndefined();
    expect(serializeDetail("")).toBeUndefined();
    expect(serializeDetail({})).toBeUndefined();
    expect(serializeDetail([])).toBeUndefined();
  });
});
