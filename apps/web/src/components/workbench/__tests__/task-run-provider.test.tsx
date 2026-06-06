import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import type { PraxisTaskClient } from "@/lib/praxis/client";
import type { RuntimeEvent } from "@/lib/praxis/runtime-events";

// The provider captures getPraxisClient() once via useRef; swap in a per-test client.
let mockClient: PraxisTaskClient;
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => mockClient,
}));

import { TaskRunProvider, useStartTask, useTaskRun } from "../task-run-provider";

function baseClient(overrides: Partial<PraxisTaskClient>): PraxisTaskClient {
  return {
    async createTask(req) {
      return { id: "t1", title: req.title ?? null, status: "draft" };
    },
    async startTask(id) {
      return { id, status: "running" };
    },
    async *streamEvents(): AsyncIterable<RuntimeEvent> {
      // no events by default; overridden per test
    },
    async sendMessage() {},
    async complete() {},
    async cancel() {},
    ...overrides,
  };
}

function Harness() {
  const startTask = useStartTask();
  const [id, setId] = useState<string>();
  const run = useTaskRun(id);
  return (
    <div>
      <button onClick={() => void startTask("生成 PPT").then(setId)}>start</button>
      <span data-testid="status">{run?.status ?? "none"}</span>
    </div>
  );
}

function renderHarness() {
  render(
    <TaskRunProvider>
      <Harness />
    </TaskRunProvider>,
  );
  fireEvent.click(screen.getByText("start"));
}

describe("TaskRunProvider", () => {
  it("marks the task failed when the stream closes without a terminal event", async () => {
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "text_delta", chunk: "partial" };
        // Stream ends here — no turn_completed / turn_failed.
      },
    });

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("failed"));
  });

  it("keeps a completed task completed even if complete() rejects", async () => {
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "turn_completed" };
      },
      async complete() {
        throw new Error("409 task already terminal");
      },
    });

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));
  });
});
