import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { TaskRunProvider, useSeedTask, useReattachOnView } from "../task-run-provider";
import type { Task } from "@ash/shared";

const history = vi.fn(async () => ({ items: [], next_cursor: null }));
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    history,
    streamEvents: async function* () {},
    listTasks: vi.fn(),
    getTask: vi.fn(),
  }),
}));

const sample: Task = {
  id: "deep-1",
  title: "深链任务",
  description: "",
  status: "awaiting_input" as const,
  createdAt: "t",
  updatedAt: "t",
  messages: [],
  deliverables: [],
  toolTraces: [],
};

// Mirror TaskSeeder: seed in a useEffect so the ordering faithfully reproduces
// production cold load (both effects fire on the same mount, seeder first).
function Seeder() {
  const seed = useSeedTask();
  useEffect(() => {
    seed(sample);
  }, [seed]);
  return null;
}

function Viewer() {
  useReattachOnView("deep-1");
  return null;
}

describe("deep-link cold load: seed + reattach", () => {
  it("attaches (history catch-up) after a server seed on the same mount", async () => {
    history.mockClear();
    render(
      <TaskRunProvider>
        <Seeder />
        <Viewer />
      </TaskRunProvider>,
    );
    await waitFor(() => expect(history).toHaveBeenCalledWith("deep-1", undefined));
  });
});
