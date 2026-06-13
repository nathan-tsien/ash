import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { TaskRunProvider, useTaskRun, useSeedTask } from "../task-run-provider";

vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    history: vi.fn(async () => ({ items: [], next_cursor: null })),
    streamEvents: async function* () {},
    listTasks: vi.fn(),
    getTask: vi.fn(),
  }),
}));

const sample = {
  id: "srv-1",
  title: "服务端任务",
  description: "",
  status: "running" as const,
  createdAt: "t",
  updatedAt: "t",
  messages: [],
  artifacts: [],
  toolTraces: [],
};

describe("seedTask", () => {
  it("exposes a server-seeded task via getRun/useTaskRun", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TaskRunProvider>{children}</TaskRunProvider>
    );
    const { result, rerender } = renderHook(
      () => ({ seed: useSeedTask(), run: useTaskRun("srv-1") }),
      { wrapper },
    );
    act(() => {
      result.current.seed(sample);
    });
    rerender();
    expect(result.current.run?.id).toBe("srv-1");
    expect(result.current.run?.title).toBe("服务端任务");
  });

  it("does not clobber an already-present run", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TaskRunProvider>{children}</TaskRunProvider>
    );
    const { result, rerender } = renderHook(
      () => ({ seed: useSeedTask(), run: useTaskRun("srv-1") }),
      { wrapper },
    );
    act(() => {
      result.current.seed(sample);
    });
    act(() => {
      result.current.seed({ ...sample, title: "changed" });
    });
    rerender();
    expect(result.current.run?.title).toBe("服务端任务"); // first seed wins
  });
});
