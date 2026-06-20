import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import type { PraxisTaskClient } from "@/lib/praxis/client";
import type { StreamEvent, MessagePage } from "@/lib/praxis/runtime-events";

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
    async listTasks() {
      return { items: [], next_cursor: null };
    },
    async listSkills() {
      return { items: [], next_cursor: null };
    },
    async getTask(id) {
      return { id, status: "draft" };
    },
    async *streamEvents(): AsyncIterable<StreamEvent> {
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
      async *streamEvents(): AsyncIterable<StreamEvent> {
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "content_block_start", index: 0, content_block: { type: "text", data: { text: "" } } };
        yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "partial" } };
        yield { type: "content_block_stop", index: 0 };
        // Stream ends here — no stream_end / message_stop with end_turn.
      },
    });

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("failed"));
  });

  it("keeps a completed task completed even if complete() rejects", async () => {
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<StreamEvent> {
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "message_stop" };
        yield { type: "stream_end", task_status: "completed" };
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
      async *streamEvents(): AsyncIterable<StreamEvent> {
        // Emit a message_ask_user tool_use block so pendingQuestionFromMessages finds it.
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "Which audience?" } } } };
        yield { type: "content_block_stop", index: 0 };
        yield { type: "message_stop" };
        yield { type: "turn_paused" };
        await answered;
        yield { type: "turn_resumed" };
        yield { type: "message_start", message: { id: "m2", task_id: "t1", seq: 1, role: "assistant", created_at: "2026-06-13T00:00:01.000Z" } };
        yield { type: "message_stop" };
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
      async *streamEvents(): AsyncIterable<StreamEvent> {
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "?" } } } };
        yield { type: "content_block_stop", index: 0 };
        yield { type: "message_stop" };
        yield { type: "turn_paused" };
        // stream ends here WITHOUT a stream_end terminal event — but task is awaiting_input
      },
    });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));
  });

  it("attach pages history, rebuilds messages, and recovers the live ask_id", async () => {
    let streamCall = 0;
    const historyPages: MessagePage[] = [
      {
        items: [
          {
            id: "m2", task_id: "t1", seq: 2, role: "assistant",
            created_at: "2026-06-13T00:00:02.000Z",
            content: [{ type: "tool_use", data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "Which audience?" } } }],
          },
        ],
        next_before_seq: 2,
      },
      {
        items: [
          {
            id: "m1", task_id: "t1", seq: 1, role: "assistant",
            created_at: "2026-06-13T00:00:01.000Z",
            content: [{ type: "text", data: { text: "earlier reply" } }],
          },
          {
            id: "m0", task_id: "t1", seq: 0, role: "user",
            created_at: "2026-06-13T00:00:00.000Z",
            content: [{ type: "text", data: { text: "hi" } }],
          },
        ],
      },
    ];
    let historyCalls = 0;
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<StreamEvent> {
        streamCall += 1;
        if (streamCall === 1) {
          // Initial run parks awaiting input via a message_ask_user block + turn_paused.
          yield { type: "message_start", message: { id: "m-live", task_id: "t1", seq: 99, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
          yield { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "live-initial", tool_name: "message_ask_user", args: { question: "Which audience?" } } } };
          yield { type: "content_block_stop", index: 0 };
          yield { type: "message_stop" };
          yield { type: "turn_paused" };
          return; // generator ends; provider leaves awaiting_input open
        }
        // Re-attach subscription: server re-emits the pending question block.
        // History already rebuilt the task with pendingQuestion; stream can be empty or
        // re-emit turn_paused to reconfirm.
        yield { type: "turn_paused" };
      },
      async history(_id: string, cursor?: number) {
        historyCalls += 1;
        return cursor !== undefined ? historyPages[1] : historyPages[0];
      },
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));

    fireEvent.click(screen.getByText("attach"));

    // Both history pages fetched, messages rebuilt from history, live ask_id recovered.
    await waitFor(() => expect(screen.getByTestId("pq")).toHaveTextContent("Which audience?"));
    await waitFor(() => expect(historyCalls).toBe(2));
  });

  it("attach is a no-op while a stream is still live (no double subscription)", async () => {
    let historyCalls = 0;
    mockClient = baseClient({
      async *streamEvents(_id: string, signal?: AbortSignal): AsyncIterable<StreamEvent> {
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "content_block_start", index: 0, content_block: { type: "tool_use", data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "?" } } } };
        yield { type: "content_block_stop", index: 0 };
        yield { type: "message_stop" };
        yield { type: "turn_paused" };
        // Stay open (as praxis does while awaiting an answer) until aborted.
        await new Promise<void>((resolve) => {
          if (signal?.aborted) resolve();
          else signal?.addEventListener("abort", () => resolve());
        });
      },
      async history() {
        historyCalls += 1;
        return { items: [] };
      },
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awaiting_input"));

    fireEvent.click(screen.getByText("attach"));
    await new Promise((r) => setTimeout(r, 0));
    expect(historyCalls).toBe(0); // guard skipped: the live stream is still open
  });

  it("forwards skillHints to client.startTask", async () => {
    const startSpy = vi.fn(async (id: string) => ({ id, status: "running" as const }));
    mockClient = baseClient({
      startTask: startSpy,
      async *streamEvents() {
        // settle immediately
      },
    });

    function SkillHarness() {
      const start = useStartTask();
      return <button onClick={() => void start("do it", ["web-search"])}>start-skill</button>;
    }
    render(
      <TaskRunProvider>
        <SkillHarness />
      </TaskRunProvider>,
    );
    fireEvent.click(screen.getByText("start-skill"));

    await waitFor(() => expect(startSpy).toHaveBeenCalledWith("t1", "do it", ["web-search"]));
  });

  it("attach is a no-op for a terminal task", async () => {
    let historyCalls = 0;
    mockClient = baseClient({
      async *streamEvents(): AsyncIterable<StreamEvent> {
        yield { type: "message_start", message: { id: "m1", task_id: "t1", seq: 0, role: "assistant", created_at: "2026-06-13T00:00:00.000Z" } };
        yield { type: "message_stop" };
        yield { type: "stream_end", task_status: "completed" };
      },
      async history() {
        historyCalls += 1;
        return { items: [] };
      },
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));

    fireEvent.click(screen.getByText("attach"));
    await new Promise((r) => setTimeout(r, 0));
    expect(historyCalls).toBe(0); // guard skipped: task is terminal
  });
});
