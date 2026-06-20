import { describe, expect, it } from "vitest";
import type { TaskStatus } from "@ash/shared";
import {
  taskStatusChipClass,
  taskStatusDotVariant,
  taskStatusIsLive,
  taskStatusLabelKey,
  taskStatusSortRank,
} from "../task-status";

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

describe("taskStatusSortRank", () => {
  it("ranks attention/active work above the finished pile", () => {
    expect(taskStatusSortRank("awaiting_input")).toBeLessThan(taskStatusSortRank("running"));
    expect(taskStatusSortRank("running")).toBeLessThan(taskStatusSortRank("pending"));
    expect(taskStatusSortRank("pending")).toBeLessThan(taskStatusSortRank("failed"));
    expect(taskStatusSortRank("failed")).toBeLessThan(taskStatusSortRank("completed"));
  });

  it("orders a mixed list deterministically and is stable within a bucket", () => {
    // Two running tasks (r1 before r2) must keep their relative order — a stable
    // sort preserves the server's LIFO order inside each bucket (PRIN-1).
    const tasks: { id: string; status: TaskStatus }[] = [
      { id: "done", status: "completed" },
      { id: "r1", status: "running" },
      { id: "ask", status: "awaiting_input" },
      { id: "r2", status: "running" },
    ];
    const ordered = [...tasks].sort((a, b) => taskStatusSortRank(a.status) - taskStatusSortRank(b.status));
    expect(ordered.map((t) => t.id)).toEqual(["ask", "r1", "r2", "done"]);
  });
});

describe("taskStatusIsLive", () => {
  it("is true only for running work", () => {
    expect(taskStatusIsLive("running")).toBe(true);
    expect(taskStatusIsLive("awaiting_input")).toBe(false);
    expect(taskStatusIsLive("completed")).toBe(false);
    expect(taskStatusIsLive("failed")).toBe(false);
    expect(taskStatusIsLive("pending")).toBe(false);
  });
});

describe("taskStatusChipClass", () => {
  it("builds chip classes only from semantic status/muted tokens (no raw palette)", () => {
    for (const status of ["awaiting_input", "completed", "failed", "pending"] as TaskStatus[]) {
      const cls = taskStatusChipClass(status);
      expect(cls).toMatch(/^[a-z0-9/\- ]+$/); // utility classes only
      expect(cls).not.toMatch(/#|\[/); // no hex literals, no arbitrary values
    }
  });
});
