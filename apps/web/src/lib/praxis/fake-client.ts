import type { PraxisTaskClient } from "./client";
import type {
  CreateTaskRequest,
  MessagePage,
  PraxisMessage,
  SkillList,
  StreamEvent,
  TaskList,
  TaskSummary,
} from "./runtime-events";

/**
 * Local fake praxis client. Emits real-shaped praxis 0.3.0 `StreamEvent`s for a
 * scripted block-oriented run, with timing so the UI streams believably. No
 * network. Fixture, not a contract.
 *
 * Two scripts: the default "generate a PPT" one-shot, and an interactive one
 * (when the task's user_input contains "ask") that pauses on a `message_ask_user`
 * tool block + `turn_paused` until `answer()` resolves, then resumes and
 * completes. zh-CN chunks are simulated agent output, not UI chrome (IMPL-3).
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface FakeRun {
  summary: TaskSummary;
  interactive: boolean;
  answered?: { resolve: () => void; promise: Promise<void> };
}

const runs = new Map<string, FakeRun>();

function fakeMessage(id: string, role: "user" | "assistant"): PraxisMessage {
  return { id, task_id: "fake", seq: 0, role, created_at: "2026-06-20T00:00:00.000Z" };
}

// Two+ seeded pages so the list UI exercises cursor pagination without a backend.
const SEED: TaskSummary[] = [
  { id: "seed-1", title: "生成季度汇报 PPT", status: "completed", project_id: null },
  { id: "seed-2", title: "整理用户访谈纪要", status: "running", project_id: null },
  { id: "seed-3", title: "竞品分析草稿", status: "awaiting_input", project_id: null },
  { id: "seed-4", title: "周报模板", status: "draft", project_id: null },
];

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

  async startTask(id: string, _userInput?: string, _skillHints?: string[]): Promise<TaskSummary> {
    const run = runs.get(id);
    if (run) {
      run.summary.status = "running";
      return run.summary;
    }
    return { id, status: "running" };
  },

  async listTasks(params?: { limit?: number; cursor?: string }): Promise<TaskList> {
    const all = [...SEED, ...[...runs.values()].map((r) => r.summary)];
    const limit = params?.limit ?? 2;
    const start = params?.cursor ? Number(params.cursor) : 0;
    const slice = all.slice(start, start + limit);
    const next = start + limit < all.length ? String(start + limit) : null;
    return { items: slice, next_cursor: next };
  },

  async getTask(id: string): Promise<TaskSummary> {
    const fromRun = runs.get(id)?.summary;
    const fromSeed = SEED.find((s) => s.id === id);
    const summary = fromRun ?? fromSeed;
    if (!summary) throw new Error(`fake getTask: unknown id ${id}`);
    return summary;
  },

  async listSkills(): Promise<SkillList> {
    return {
      items: [
        { id: "web-search", kind: "skill", display_name: "web-search", description: "检索公开网页并返回结构化摘要。", scope: "global", binding: "hint" },
        { id: "doc-write", kind: "skill", display_name: "doc-write", description: "生成与修订 Markdown 文档。", scope: "global", binding: "hint" },
      ],
      next_cursor: null,
    };
  },

  async *streamEvents(id: string): AsyncIterable<StreamEvent> {
    const run = runs.get(id);
    yield { type: "message_start", message: fakeMessage("m1", "assistant") };

    // Text block, streamed token by token.
    yield { type: "content_block_start", index: 0, content_block: { type: "text", data: { text: "" } } };
    for (const chunk of ["好的，", "我来为你生成", "一份演示文稿。"]) {
      await delay(160);
      yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } };
    }
    yield { type: "content_block_stop", index: 0 };

    let nextIndex = 1;
    if (run?.interactive) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      run.answered = { resolve, promise };
      yield {
        type: "content_block_start",
        index: nextIndex,
        content_block: { type: "tool_use", data: { call_id: "q1", tool_name: "message_ask_user", args: { question: "需要面向什么受众？" } } },
      };
      yield { type: "content_block_stop", index: nextIndex };
      yield { type: "turn_paused" };
      await promise;
      yield { type: "turn_resumed" };
      nextIndex += 1;
    }

    // Tool call: args arrive as input_json_delta, assembled on stop.
    const toolIndex = nextIndex;
    yield {
      type: "content_block_start",
      index: toolIndex,
      content_block: { type: "tool_use", data: { call_id: "c1", tool_name: "slides.render", args: {} } },
    };
    for (const part of ['{"slides":', "8}"]) {
      await delay(120);
      yield { type: "content_block_delta", index: toolIndex, delta: { type: "input_json_delta", partial_json: part } };
    }
    yield { type: "content_block_stop", index: toolIndex };

    await delay(160);
    yield { type: "message_delta", stop_reason: "end_turn" };
    yield { type: "message_stop" };

    // Tool result + closing remark in a second assistant message.
    yield { type: "message_start", message: fakeMessage("m2", "assistant") };
    yield {
      type: "content_block_start",
      index: 0,
      content_block: { type: "tool_result", data: { call_id: "c1", ok: true, content: [{ type: "text", data: { text: "大纲已生成" } }] } },
    };
    yield { type: "content_block_stop", index: 0 };
    yield { type: "content_block_start", index: 1, content_block: { type: "text", data: { text: "" } } };
    await delay(120);
    yield { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "已完成，演示文稿见右侧工作区。" } };
    yield { type: "content_block_stop", index: 1 };
    yield { type: "message_stop" };

    yield { type: "stream_end", task_status: "completed" };
  },

  async sendMessage(id: string): Promise<void> {
    const run = runs.get(id);
    if (run) run.summary.status = "running";
  },

  async answer(id: string): Promise<void> {
    runs.get(id)?.answered?.resolve();
  },

  async history(): Promise<MessagePage> {
    // Scripted persisted Messages, ascending by seq (oldest first, praxis 0.4.0),
    // enough to exercise the projector.
    return {
      items: [
        { id: "m0", task_id: "fake", seq: 0, role: "user", created_at: "2026-06-13T00:00:00.000Z", content: [{ type: "text", data: { text: "生成 PPT" } }] },
        { id: "m1", task_id: "fake", seq: 1, role: "assistant", created_at: "2026-06-13T00:00:01.000Z", content: [{ type: "text", data: { text: "好的" } }] },
      ],
    };
  },

  async complete(): Promise<void> {},
  async cancel(): Promise<void> {},
};
