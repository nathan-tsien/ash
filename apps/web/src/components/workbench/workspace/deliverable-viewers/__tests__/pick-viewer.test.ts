import { describe, expect, it } from "vitest";
import { pickDeliverableViewer } from "../pick-viewer";

describe("pickDeliverableViewer", () => {
  it("maps by mime", () => {
    expect(pickDeliverableViewer("image/png", "a.png")).toBe("image");
    expect(pickDeliverableViewer("application/pdf", "a.pdf")).toBe("pdf");
    expect(pickDeliverableViewer("text/markdown", "a.md")).toBe("markdown");
    expect(pickDeliverableViewer("application/json", "a.json")).toBe("code");
    expect(pickDeliverableViewer("text/plain", "a.txt")).toBe("text");
    expect(pickDeliverableViewer("application/octet-stream", "a.bin")).toBe("none");
  });
  it("falls back to extension when mime is generic", () => {
    expect(pickDeliverableViewer("application/octet-stream", "notes.md")).toBe("markdown");
    expect(pickDeliverableViewer("application/octet-stream", "main.ts")).toBe("code");
    expect(pickDeliverableViewer("text/csv", "data.csv")).toBe("text");
  });
});
