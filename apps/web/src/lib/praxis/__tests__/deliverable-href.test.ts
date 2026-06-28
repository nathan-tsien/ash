import { describe, expect, it } from "vitest";
import { deliverableHref } from "../deliverable-href";

describe("deliverableHref", () => {
  it("prefixes a praxis-relative /v1/tasks uri with the BFF proxy base", () => {
    expect(deliverableHref("/v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("handles a uri missing the leading slash", () => {
    expect(deliverableHref("v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("reduces an absolute praxis url to its proxied path", () => {
    expect(deliverableHref("https://praxis.internal/v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("passes through an external http(s) link unchanged", () => {
    expect(deliverableHref("https://example.com/report.pdf")).toBe("https://example.com/report.pdf");
  });
});
