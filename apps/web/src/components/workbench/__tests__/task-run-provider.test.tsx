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
import { useAnswerTask, useAttachTask } from "../task-run-provider";

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
    async answer() {},
    async history() {
      return { items: [] };
    },
    async complete() {},
    async cancel() {},
    ...overrides,
  };
}

function Harness() {
  const startTask = useStartTask();
  const answer = useAnswerTask();
  const attach = useAttachTask();
  const [id, setId] = useState<string>();
  const run = useTaskRun(id);
  return (
    <div>
      <button onClick={() => void startTask("ask me").then(setId)}>start</button>
      <button onClick={() => id && void answer(id, "yes")}>answer</button>
      <button onClick={() => id && void attach(id)}>attach</button>
      <span data-testid="status">{run?.status ?? "none"}</span>
      <span data-testid="pq">{run?.pendingQuestion?.text ?? ""}</span>
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

  it("surfaces a pending question, then resumes to completed after answer", async () => {
    let resolveAnswer!: () => void;
    const answered = new Promise<void>((r) => (resolveAnswer = r));
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "ask_user", ask_id: "q1", text: "Which audience?", attachments: [] };
        await answered;
        yield { type: "turn_resumed" };
        yield { type: "turn_completed" };
        yield { type: "stream_end", task_status: "completed" };
      },
      async answer() {
        resolveAnswer();
      },
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));
    expect(screen.getByTestId("pq")).toHaveTextContent("Which audience?");

    fireEvent.click(screen.getByText("answer"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));
  });

  it("does not mark awaiting_input tasks failed when the stream stays open", async () => {
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<RuntimeEvent> {
        yield { type: "turn_started" };
        yield { type: "ask_user", ask_id: "q1", text: "?", attachments: [] };
        // stream ends here WITHOUT a terminal event — but task is awaiting_input
      },
    });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));
  });
});
