import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskSummary } from "./runtime-events";
import { PraxisError } from "./errors";
import { SseParser } from "./sse";

/**
 * Real praxis transport. Runs in the browser and talks ONLY to same-origin
 * `/api/praxis/...` BFF routes (the httpOnly iam cookie rides along
 * automatically); the route forwards the JWT to praxis. See
 * docs/superpowers/specs/2026-06-06-praxis-live-transport.md + ADR-0012.
 *
 * Enabled via NEXT_PUBLIC_PRAXIS_TRANSPORT=http (default is the fake client).
 */
const BASE = "/api/praxis/tasks";

async function readError(res: Response, method: string, url: string): Promise<PraxisError> {
  let code = "";
  try {
    const body = (await res.json()) as { code?: string };
    code = body?.code ?? "";
  } catch {
    // non-JSON error body; fall through to status-only message
  }
  const suffix = code ? ` (${code})` : "";
  return new PraxisError(`praxis ${method} ${url} -> ${res.status}${suffix}`, res.status, code);
}

async function postJson<T>(url: string, body?: unknown): Promise<T | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await readError(res, "POST", url);
  if (res.status === 204) return undefined;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : undefined;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw await readError(res, "GET", url);
  return (await res.json()) as T;
}

export const httpPraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    const out = await postJson<TaskSummary>(BASE, req);
    if (!out) throw new Error("praxis createTask returned no body");
    return out;
  },

  async startTask(id: string, userInput: string): Promise<TaskSummary> {
    const out = await postJson<TaskSummary>(`${BASE}/${id}/start`, { user_input: userInput });
    if (!out) throw new Error("praxis startTask returned no body");
    return out;
  },

  async *streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent> {
    const res = await fetch(`${BASE}/${id}/events`, {
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

  async sendMessage(id: string, text: string): Promise<void> {
    await postJson(`${BASE}/${id}/messages`, { text });
  },

  async answer(id: string, askId: string, answer: string): Promise<void> {
    await postJson(`${BASE}/${id}/answers`, { ask_id: askId, answer });
  },

  async history(id: string, cursor?: string): Promise<TaskHistoryPage> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return getJson<TaskHistoryPage>(`${BASE}/${id}/history${qs}`);
  },

  async complete(id: string): Promise<void> {
    await postJson(`${BASE}/${id}/complete`);
  },

  async cancel(id: string): Promise<void> {
    await postJson(`${BASE}/${id}/cancel`);
  },
};
