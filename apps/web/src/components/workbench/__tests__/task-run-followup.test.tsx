import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TaskRunProvider, useSendFollowUp, useSeedTask, useTaskRun } from "../task-run-provider";

const sendMessage = vi.fn(async () => {});
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    sendMessage,
    history: vi.fn(async () => ({ items: [], next_cursor: null })),
    streamEvents: async function* () {}, // empty stream: completes immediately
    listTasks: vi.fn(), getTask: vi.fn(),
  }),
}));

const sample = { id: "f-1", title: "x", description: "", status: "completed" as const, createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] };

describe("sendFollowUp", () => {
  it("posts the message and appends an optimistic user message", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
    const { result, rerender } = renderHook(() => ({ seed: useSeedTask(), send: useSendFollowUp(), run: useTaskRun("f-1") }), { wrapper });
    act(() => { result.current.seed(sample); });
    await act(async () => { await result.current.send("f-1", "再补一页结尾"); });
    rerender();
    expect(sendMessage).toHaveBeenCalledWith("f-1", "再补一页结尾");
    const msgs = result.current.run?.messages ?? [];
    expect(msgs.some((m) => m.role === "user" && m.content === "再补一页结尾")).toBe(true);
  });
});
