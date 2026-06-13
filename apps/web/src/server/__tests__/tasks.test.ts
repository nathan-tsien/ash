import { describe, expect, it, vi } from "vitest";

// Stub server-only so imports do not throw outside a server bundle.
vi.mock("server-only", () => ({}));

vi.mock("../praxis-client", () => ({
  serverPraxisClient: () => ({
    GET: vi.fn(async (path: string) => {
      if (path === "/v1/tasks")
        return {
          data: {
            items: [{ id: "t1", title: "T", status: "running", project_id: null }],
            next_cursor: null,
          },
          error: undefined,
          response: { ok: true },
        };
      return {
        data: { id: "t1", title: "T", status: "completed", project_id: null },
        error: undefined,
        response: { ok: true },
      };
    }),
  }),
}));

describe("server tasks", () => {
  it("listTasks projects summaries to card tasks", async () => {
    const { listTasks } = await import("../tasks");
    const tasks = await listTasks("zh");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("t1");
    expect(tasks[0].status).toBe("running");
  });

  it("getActiveTask returns a card task for a known id", async () => {
    const { getActiveTask } = await import("../tasks");
    const task = await getActiveTask("t1", "zh");
    expect(task?.status).toBe("completed");
  });
});
