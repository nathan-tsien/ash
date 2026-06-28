import { describe, expect, it } from "vitest";
import { attachmentsToAsh } from "../attachments";

describe("attachmentsToAsh", () => {
  it("maps praxis snake_case attachments to AshAttachment", () => {
    const out = attachmentsToAsh([
      { id: "a2", name: "out.xlsx", mime_type: "application/vnd.ms-excel", size_bytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
    ] as never);
    expect(out).toEqual([
      { id: "a2", name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
    ]);
  });

  it("returns undefined for empty/absent", () => {
    expect(attachmentsToAsh(undefined)).toBeUndefined();
    expect(attachmentsToAsh([])).toBeUndefined();
  });
});
