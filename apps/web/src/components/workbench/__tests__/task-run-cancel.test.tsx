import { describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import {
  TaskRunProvider,
  useAttachTask,
  useCancelTask,
  useSeedTask,
  useTaskRun,
} from "../task-run-provider";

const cancel = vi.fn(async () => {});
// streamEvents that stays open until its AbortSignal fires, recording the signal
// per task so a test can assert WHICH task's stream was aborted.
const signals: Record<string, AbortSignal> = {};
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    cancel,
    history: vi.fn(async () => ({ items: [], next_cursor: null })),
    streamEvents: (id: string, signal: AbortSignal) => {
      signals[id] = signal;
      return (async function* () {
        await new Promise<void>((resolve) => {
          if (signal.aborted) return resolve();
          signal.addEventListener("abort", () => resolve());
        });
      })();
    },
    listTasks: vi.fn(),
    getTask: vi.fn(),
  }),
}));

const sample = { id: "c-1", title: "x", description: "", status: "running" as const, createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] };
const running = (id: string) => ({ id, title: id, description: "", status: "running" as const, createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] });

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

  it("aborts only the target task's stream, leaving other streams running", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
    const { result } = renderHook(
      () => ({ seed: useSeedTask(), attach: useAttachTask(), cancelTask: useCancelTask() }),
      { wrapper },
    );
    // Two tasks, each with its own live stream.
    act(() => { result.current.seed(running("a")); result.current.seed(running("b")); });
    act(() => { void result.current.attach("a"); void result.current.attach("b"); });
    await waitFor(() => {
      expect(signals.a).toBeDefined();
      expect(signals.b).toBeDefined();
    });

    await act(async () => { await result.current.cancelTask("a"); });

    expect(cancel).toHaveBeenCalledWith("a");
    expect(signals.a.aborted).toBe(true); // target aborted
    expect(signals.b.aborted).toBe(false); // bystander untouched

    // Clean up b's open stream so it does not leak past the test.
    await act(async () => { await result.current.cancelTask("b"); });
  });
});
