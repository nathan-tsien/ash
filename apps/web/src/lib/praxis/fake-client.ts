import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskSummary } from "./runtime-events";

/**
 * Local fake praxis client. Emits real-shaped events for a scripted run, with
 * timing so the UI streams believably. No network. Fixture, not a contract.
 *
 * Two scripts: the default "generate a PPT" one-shot, and an interactive one
 * (when the task's user_input contains "ask") that pauses on `ask_user` until
 * `answer()` resolves, then resumes and completes. zh-CN chunks are simulated
 * agent output, not UI chrome (IMPL-3; deviation D-12).
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface FakeRun {
  summary: TaskSummary;
  interactive: boolean;
  answered?: { resolve: () => void; promise: Promise<void> };
}

const runs = new Map<string, FakeRun>();

export const fakePraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    const id = crypto.randomUUID();
    const summary: TaskSummary = {
      id,
      title: req.title ?? null,
      status: "draft",
      project_id: req.project_id ?? null,
    };
    runs.set(id, { summary, interactive: !!req.user_input && req.user_input.includes("ask") });
    return summary;
  },

  async startTask(id: string): Promise<TaskSummary> {
    const run = runs.get(id);
    if (run) {
      run.summary.status = "running";
      return run.summary;
    }
    return { id, status: "running" };
  },

  async *streamEvents(id: string): AsyncIterable<RuntimeEvent> {
    const run = runs.get(id);
    yield { type: "turn_started" };
    for (const chunk of ["好的，", "我来为你生成", "一份演示文稿。", "先梳理大纲…"]) {
      await delay(160);
      yield { type: "text_delta", chunk };
    }

    if (run?.interactive) {
      // Pause until answer() is called.
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      run.answered = { resolve, promise };
      yield { type: "ask_user", ask_id: "q1", text: "需要面向什么受众？", attachments: [] };
      await promise;
      yield { type: "turn_resumed" };
    }

    yield { type: "tool_dispatch_started", call_id: "c1", tool_name: "outline.generate", args: { slides: 8 } };
    await delay(500);
    yield { type: "tool_dispatch_ended", call_id: "c1", ok: true };

    // Second tool call preserved so the one-shot reducer test keeps its 2-trace assertion.
    for (const chunk of ["大纲就绪，", "正在排版每一页…"]) {
      await delay(180);
      yield { type: "text_delta", chunk };
    }

    yield { type: "tool_dispatch_started", call_id: "c2", tool_name: "slides.render", args: { theme: "minimal" } };
    await delay(900);
    yield { type: "tool_dispatch_ended", call_id: "c2", ok: true };

    await delay(160);
    yield { type: "text_delta", chunk: "已完成，演示文稿见右侧工作区。" };
    await delay(80);
    yield { type: "turn_completed" };
    yield { type: "stream_end", task_status: "completed" };
  },

  async sendMessage(): Promise<void> {},

  async answer(id: string): Promise<void> {
    runs.get(id)?.answered?.resolve();
  },

  async history(): Promise<TaskHistoryPage> {
    // Scripted committed blocks (newest-first), enough to exercise the projector.
    return {
      items: [
        { seq: 1, ts: "2026-06-13T00:00:01.000Z", event: { type: "assistant_message", text: "好的" } },
        { seq: 0, ts: "2026-06-13T00:00:00.000Z", event: { type: "user_message", content: "生成 PPT" } },
      ],
      next_cursor: null,
    };
  },

  async complete(): Promise<void> {},
  async cancel(): Promise<void> {},
};
