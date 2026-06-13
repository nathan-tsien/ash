import { describe, expect, it } from "vitest";
import { taskStatusDotVariant, taskStatusLabelKey } from "../task-status";

describe("task-status helpers", () => {
  it("awaiting_input maps to the running dot variant", () => {
    expect(taskStatusDotVariant("awaiting_input")).toBe("running");
  });

  it("awaiting_input maps to its own label key", () => {
    expect(taskStatusLabelKey("awaiting_input")).toBe("awaitingInput");
  });

  it("existing statuses are unchanged", () => {
    expect(taskStatusDotVariant("completed")).toBe("success");
    expect(taskStatusLabelKey("failed")).toBe("failed");
  });
});
