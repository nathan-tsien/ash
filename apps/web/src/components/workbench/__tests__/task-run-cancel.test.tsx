import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { TaskRunProvider, useCancelTask, useSeedTask, useTaskRun } from "../task-run-provider";

const cancel = vi.fn(async () => {});
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({ cancel, history: vi.fn(async () => ({ items: [], next_cursor: null })), streamEvents: async function* () {}, listTasks: vi.fn(), getTask: vi.fn() }),
}));

const sample = { id: "c-1", title: "x", description: "", status: "running" as const, createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] };

describe("cancelTask", () => {
  it("calls client.cancel and flips status to failed", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
    const { result, rerender } = renderHook(() => ({ seed: useSeedTask(), cancelTask: useCancelTask(), run: useTaskRun("c-1") }), { wrapper });
    act(() => { result.current.seed(sample); });
    await act(async () => { await result.current.cancelTask("c-1"); });
    rerender();
    expect(cancel).toHaveBeenCalledWith("c-1");
    expect(result.current.run?.status).toBe("failed");
  });
});
