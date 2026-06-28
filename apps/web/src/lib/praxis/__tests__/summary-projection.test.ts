import { describe, expect, it } from "vitest";
import { summaryToTask } from "../summary-projection";

describe("summaryToTask", () => {
  it("projects a list/get summary into a card-shaped Task", () => {
    const task = summaryToTask(
      { id: "11111111-1111-1111-1111-111111111111", title: "做个 PPT", status: "running", project_id: null },
      { ts: "2026-06-13T00:00:00.000Z", untitled: "未命名任务" },
    );
    expect(task.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(task.title).toBe("做个 PPT");
    expect(task.status).toBe("running");
    expect(task.projectId).toBeUndefined();
    expect(task.messages).toEqual([]);
    expect(task.deliverables).toEqual([]);
    expect(task.toolTraces).toEqual([]);
  });

  it("falls back to an untitled label and maps cancelled->failed", () => {
    const task = summaryToTask(
      { id: "22222222-2222-2222-2222-222222222222", title: null, status: "cancelled", project_id: "33333333-3333-3333-3333-333333333333" },
      { ts: "2026-06-13T00:00:00.000Z", untitled: "未命名任务" },
    );
    expect(task.title).toBe("未命名任务");
    expect(task.status).toBe("failed");
    expect(task.projectId).toBe("33333333-3333-3333-3333-333333333333");
  });
});
