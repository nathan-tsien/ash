import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskList, TaskSummary } from "./runtime-events";
import { PraxisError } from "./errors";
import { SseParser } from "./sse";
import { createPraxisFetchClient } from "./openapi-fetch-client";

/**
 * Real praxis transport. Runs in the browser and talks ONLY to same-origin
 * `/api/praxis/...` BFF routes (the httpOnly iam cookie rides along
 * automatically); the route forwards the JWT to praxis. See
 * docs/superpowers/specs/2026-06-06-praxis-live-transport.md + ADR-0012.
 *
 * Control-plane calls (list, create, start, etc.) go through openapi-fetch so
 * the generated `paths` type guards every URL and param shape at compile time.
 * SSE is the one hand-written carve-out: openapi-fetch cannot consume
 * text/event-stream, so we read the body with a manual ReadableStream loop
 * exactly as before.
 *
 * Enabled via NEXT_PUBLIC_PRAXIS_TRANSPORT=http (default is the fake client).
 */

// Browser transport: same-origin BFF carries the httpOnly cookie automatically.
// The fetch wrapper delegates to the current globalThis.fetch at call time so
// that test stubs applied via vi.stubGlobal / globalThis.fetch assignment are
// picked up correctly (openapi-fetch captures baseFetch at construction time,
// not at call time, which would break stubbing otherwise).
const api = createPraxisFetchClient({
  baseUrl: "/api/praxis",
  fetch: (req) => globalThis.fetch(req),
});
// SSE path mirrors the contract path; the BFF is a transparent forwarder.
const SSE_BASE = "/api/praxis/v1/tasks";

function unwrap<T>(res: { data?: T; error?: unknown; response: Response }, op: string): T {
  if (res.error !== undefined || !res.response.ok) {
    // openapi-fetch sets res.error to the parsed JSON body on non-2xx responses.
    const body = res.error as { code?: string; message?: string } | undefined;
    const code = body?.code ?? "";
    const suffix = code ? ` (${code})` : "";
    throw new PraxisError(
      `praxis ${op} -> ${res.response.status}${suffix}`,
      res.response.status,
      code,
    );
  }
  return res.data as T;
}

export const httpPraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    return unwrap(await api.POST("/v1/tasks", { body: req }), "createTask");
  },

  async startTask(id: string, userInput: string): Promise<TaskSummary> {
    return unwrap(
      await api.POST("/v1/tasks/{id}/start", { params: { path: { id } }, body: { user_input: userInput } }),
      "startTask",
    );
  },

  async listTasks(params?: { limit?: number; cursor?: string }): Promise<TaskList> {
    return unwrap(
      await api.GET("/v1/tasks", { params: { query: { limit: params?.limit, cursor: params?.cursor } } }),
      "listTasks",
    );
  },

  async getTask(id: string): Promise<TaskSummary> {
    return unwrap(
      await api.GET("/v1/tasks/{id}", { params: { path: { id } } }),
      "getTask",
    );
  },

  async sendMessage(id: string, text: string): Promise<void> {
    unwrap(
      // These accept-and-return-nothing endpoints answer 202 with an EMPTY body.
      // openapi-fetch only short-circuits parsing for 204 / HEAD / Content-Length:0,
      // so a bodiless 202 would otherwise hit response.json() and throw
      // "Unexpected end of JSON input". parseAs:"text" reads the (empty) body
      // instead of JSON-parsing it; the error path is unaffected (openapi-fetch
      // always decodes errors via text + safe JSON.parse, independent of parseAs).
      await api.POST("/v1/tasks/{id}/messages", { params: { path: { id } }, body: { text }, parseAs: "text" }),
      "sendMessage",
    );
  },

  async answer(id: string, askId: string, answer: string): Promise<void> {
    unwrap(
      await api.POST("/v1/tasks/{id}/answers", { params: { path: { id } }, body: { ask_id: askId, answer }, parseAs: "text" }),
      "answer",
    );
  },

  async history(id: string, cursor?: string): Promise<TaskHistoryPage> {
    return unwrap(
      await api.GET("/v1/tasks/{id}/history", { params: { path: { id }, query: { cursor } } }),
      "history",
    );
  },

  async complete(id: string): Promise<void> {
    unwrap(
      await api.POST("/v1/tasks/{id}/complete", { params: { path: { id } }, parseAs: "text" }),
      "complete",
    );
  },

  async cancel(id: string): Promise<void> {
    unwrap(
      await api.POST("/v1/tasks/{id}/cancel", { params: { path: { id } }, parseAs: "text" }),
      "cancel",
    );
  },

  async *streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent> {
    // SSE is the one hand-written carve-out: openapi-fetch cannot read
    // text/event-stream. Still yields the generated RuntimeEvent union.
    const res = await fetch(`${SSE_BASE}/${id}/events`, {
      headers: { accept: "text/event-stream" },
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`praxis events ${id} -> ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const data of parser.push(decoder.decode(value, { stream: true }))) {
          yield JSON.parse(data) as RuntimeEvent;
        }
      }
      // Flush at stream end: the decoder may hold a multi-byte char that spanned
      // the last read, and the final frame may arrive without a trailing blank
      // line. Without this the terminal event (e.g. turn_completed) can be lost.
      for (const data of parser.push(decoder.decode())) {
        yield JSON.parse(data) as RuntimeEvent;
      }
      for (const data of parser.flush()) {
        yield JSON.parse(data) as RuntimeEvent;
      }
    } finally {
      reader.releaseLock();
    }
  },
};
