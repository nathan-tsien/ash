import { describe, expect, it } from "vitest";
import { deliverablesFromMessages } from "../deliverables";
import type { Message } from "../types";

const msg = (id: string, attachments: Message["attachments"]): Message => ({
  id, role: "assistant", blocks: [], createdAt: "2026-06-28T00:00:00Z", attachments,
});

describe("deliverablesFromMessages", () => {
  it("keeps only agent_generated attachments", () => {
    const out = deliverablesFromMessages([
      msg("m1", [
        { id: "a1", name: "in.csv", mimeType: "text/csv", sizeBytes: 10, uri: "/v1/tasks/t/attachments/a1", kind: "file", source: "user_upload" },
        { id: "a2", name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
      ]),
    ]);
    expect(out.map((d) => d.id)).toEqual(["a2"]);
    expect(out[0]).toMatchObject({ name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file" });
  });

  it("dedupes by id across messages, preserving first-seen order", () => {
    const a = { id: "a", name: "a.pdf", mimeType: "application/pdf", sizeBytes: 1, uri: "u-a", kind: "file" as const, source: "agent_generated" as const };
    const b = { id: "b", name: "b.png", mimeType: "image/png", sizeBytes: 2, uri: "u-b", kind: "image" as const, source: "agent_generated" as const };
    const out = deliverablesFromMessages([msg("m1", [a, b]), msg("m2", [{ ...a, name: "a-v2.pdf" }])]);
    expect(out.map((d) => d.id)).toEqual(["a", "b"]);
    expect(out[0].name).toBe("a.pdf"); // first-seen wins
  });

  it("returns [] when no attachments", () => {
    expect(deliverablesFromMessages([msg("m1", undefined)])).toEqual([]);
  });
});
