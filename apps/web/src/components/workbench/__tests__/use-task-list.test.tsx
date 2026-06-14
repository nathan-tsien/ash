import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { AshLocale, Task } from "@ash/shared";

const { listTasks } = vi.hoisted(() => ({ listTasks: vi.fn() }));
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({ listTasks }),
}));

import { useTaskList } from "../use-task-list";

const seed: Task[] = [
  {
    id: "ssr-1",
    title: "SSR snapshot",
    description: "",
    status: "pending",
    createdAt: "t",
    updatedAt: "t",
    messages: [],
    artifacts: [],
    toolTraces: [],
  },
];

function Probe({ locale }: { locale: AshLocale }) {
  const tasks = useTaskList(seed, locale);
  return <div data-testid="ids">{tasks.map((t) => t.id).join(",")}</div>;
}

// Both behaviors live in one test: vitest mis-attributes a caught async mock
// rejection to a *following* test in the same file, so a second `it` would flag a
// spurious "network" failure even though the hook swallows it (the component
// below stays on the SSR seed, proving it is handled).
describe("useTaskList", () => {
  it("refetches the list on mount, and keeps the SSR seed if the refetch fails", async () => {
    // Success: the fetched list replaces the SSR seed.
    listTasks.mockImplementation(async () => ({
      items: [{ id: "live-1", title: "Live task", status: "completed" }],
      next_cursor: null,
    }));
    render(<Probe locale="zh" />);
    expect(screen.getByTestId("ids")).toHaveTextContent("ssr-1"); // seed first
    await waitFor(() => expect(screen.getByTestId("ids")).toHaveTextContent("live-1"));
    expect(listTasks).toHaveBeenCalledWith({ limit: 50 });

    // Failure: keep the SSR seed rather than blanking the list.
    cleanup();
    listTasks.mockReset();
    listTasks.mockImplementation(async () => {
      throw new Error("network");
    });
    render(<Probe locale="zh" />);
    await waitFor(() => expect(listTasks).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId("ids").textContent).toBe("ssr-1");
  });
});
