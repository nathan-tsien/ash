import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";

/**
 * Local fake praxis client. Emits real-shaped `RuntimeEvent`s for a "generate a
 * PPT" script, with timing so the UI streams believably. No network. This is a
 * fixture, not a contract — when the real transport lands, swap in the http
 * client (see `getPraxisClient`).
 *
 * The zh-CN chunks below are simulated *agent output* (mock model reply content),
 * not app UI chrome, so they intentionally stay out of the next-intl catalogs
 * (IMPL-3 governs UI copy; see deviation D-12). Real model output is whatever the
 * live transport streams.
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const summaries = new Map<string, TaskSummary>();

export const fakePraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    const id = crypto.randomUUID();
    const summary: TaskSummary = {
      id,
      title: req.title ?? null,
      status: "draft",
      project_id: req.project_id ?? null,
    };
    summaries.set(id, summary);
    return summary;
  },

  async startTask(id: string): Promise<TaskSummary> {
    const existing = summaries.get(id);
    if (existing) {
      existing.status = "running";
      return existing;
    }
    return { id, status: "running" };
  },

  async *streamEvents(): AsyncIterable<RuntimeEvent> {
    yield { type: "turn_started" };
    for (const chunk of ["好的，", "我来为你生成", "一份演示文稿。", "先梳理大纲…"]) {
      await delay(160);
      yield { type: "text_delta", chunk };
    }

    yield { type: "tool_dispatch_started", call_id: "c1", tool_name: "outline.generate", args: { slides: 8 } };
    await delay(700);
    yield { type: "tool_dispatch_ended", call_id: "c1", ok: true };

    for (const chunk of ["大纲就绪，", "正在排版每一页…"]) {
      await delay(180);
      yield { type: "text_delta", chunk };
    }

    yield { type: "tool_dispatch_started", call_id: "c2", tool_name: "slides.render", args: { theme: "minimal" } };
    await delay(900);
    yield { type: "tool_dispatch_ended", call_id: "c2", ok: true };

    await delay(160);
    yield { type: "text_delta", chunk: "已完成，演示文稿见右侧工作区。" };
    await delay(120);
    yield { type: "turn_completed" };
  },

  async sendMessage(): Promise<void> {},
  async complete(): Promise<void> {},
  async cancel(): Promise<void> {},
};
