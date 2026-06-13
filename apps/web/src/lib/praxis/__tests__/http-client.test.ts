import { afterEach, describe, expect, it, vi } from "vitest";
import { httpPraxisClient } from "../http-client";

function stubFetch() {
  const fn = vi.fn();
  vi.stubGlobal("fetch", fn);
  return fn;
}

function sseResponse(...frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const f of frames) controller.enqueue(enc.encode(f));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

/**
 * openapi-fetch passes a Request object to the fetch function. Helper to
 * extract the pathname from a Request or plain string so assertions are
 * transport-agnostic.
 */
function extractUrl(arg: Request | string): URL {
  const urlStr = typeof arg === "string" ? arg : (arg as Request).url;
  return new URL(urlStr, "http://x");
}

/**
 * Reads the body of the first fetch call, supporting both the old
 * (string + init) and new (Request) calling conventions.
 */
async function extractBody(spy: ReturnType<typeof vi.fn>): Promise<unknown> {
  const arg = spy.mock.calls[0][0] as Request | string;
  if (typeof arg === "string") {
    return JSON.parse(spy.mock.calls[0][1].body as string);
  }
  return JSON.parse(await (arg as Request).text());
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("httpPraxisClient", () => {
  it("createTask POSTs to /api/praxis/v1/tasks and returns the summary", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"id":"t1","status":"draft"}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const summary = await httpPraxisClient.createTask({ user_input: "hi", title: "hi" });

    expect(summary).toEqual({ id: "t1", status: "draft" });
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks");
    const body = await extractBody(fetchFn);
    expect(body).toEqual({ user_input: "hi", title: "hi" });
  });

  it("startTask POSTs user_input to the start endpoint", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"id":"t1","status":"running"}', {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const summary = await httpPraxisClient.startTask("t1", "do it");

    expect(summary.status).toBe("running");
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1/start");
    const body = await extractBody(fetchFn);
    expect(body).toEqual({ user_input: "do it" });
  });

  it("complete POSTs and tolerates a 204 with no body", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(httpPraxisClient.complete("t1")).resolves.toBeUndefined();
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1/complete");
  });

  it("streamEvents parses the SSE body into RuntimeEvents", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      sseResponse(
        'data: {"type":"turn_started"}\n\n',
        'data: {"type":"text_delta","chunk":"hi"}\n\n',
        'data: {"type":"turn_completed"}\n\n',
      ),
    );

    const events = [];
    for await (const e of httpPraxisClient.streamEvents("t1")) events.push(e);

    expect(events).toEqual([
      { type: "turn_started" },
      { type: "text_delta", chunk: "hi" },
      { type: "turn_completed" },
    ]);
    // SSE still uses the hand-written fetch path: plain string URL.
    expect(fetchFn.mock.calls[0][0]).toBe("/api/praxis/v1/tasks/t1/events");
  });

  it("yields a final frame that arrives without a trailing blank line", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      sseResponse(
        'data: {"type":"turn_started"}\n\n',
        // Server closes right after the last event, no terminating blank line.
        'data: {"type":"turn_completed"}\n',
      ),
    );

    const events = [];
    for await (const e of httpPraxisClient.streamEvents("t1")) events.push(e);

    expect(events).toEqual([{ type: "turn_started" }, { type: "turn_completed" }]);
  });

  it("reassembles a multi-byte UTF-8 char split across chunks", async () => {
    const fetchFn = stubFetch();
    // "好" is 3 UTF-8 bytes; split the frame mid-character across two reads.
    const enc = new TextEncoder();
    const full = enc.encode('data: {"type":"text_delta","chunk":"好"}\n\n');
    const cut = full.indexOf(enc.encode("好")[0]) + 1; // mid-codepoint
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(full.slice(0, cut));
        controller.enqueue(full.slice(cut));
        controller.close();
      },
    });
    fetchFn.mockResolvedValue(new Response(body, { status: 200 }));

    const events = [];
    for await (const e of httpPraxisClient.streamEvents("t1")) events.push(e);

    expect(events).toEqual([{ type: "text_delta", chunk: "好" }]);
  });

  it("throws when a control call returns a non-2xx status", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response('{"error":"boom"}', { status: 500 }));

    await expect(httpPraxisClient.createTask({ user_input: "x" })).rejects.toThrow();
  });

  it("answer POSTs ask_id + answer to the answers endpoint and tolerates 202", async () => {
    const fetchFn = stubFetch();
    // 202 Accepted: openapi-fetch parses the body; supply Content-Length: 0 to
    // short-circuit body parsing (the void return means the body is irrelevant).
    fetchFn.mockResolvedValue(new Response(null, { status: 202, headers: { "Content-Length": "0" } }));

    await expect(httpPraxisClient.answer("t1", "q1", "marketers")).resolves.toBeUndefined();
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1/answers");
    const arg = fetchFn.mock.calls[0][0] as Request | string;
    expect(typeof arg === "string" ? "POST" : (arg as Request).method).toBe("POST");
    const body = await extractBody(fetchFn);
    expect(body).toEqual({ ask_id: "q1", answer: "marketers" });
  });

  it("history GETs the history endpoint and returns the page", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"items":[{"seq":0,"ts":"2026-06-13T00:00:00.000Z","event":{"type":"assistant_message","text":"hi"}}],"next_cursor":null}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const page = await httpPraxisClient.history("t1");
    expect(page.items).toHaveLength(1);
    expect(page.next_cursor).toBeNull();
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1/history");
  });

  it("history forwards cursor as a query param", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response('{"items":[]}', { status: 200, headers: { "content-type": "application/json" } }));

    await httpPraxisClient.history("t1", "abc");
    const url = extractUrl(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1/history");
    expect(url.searchParams.get("cursor")).toBe("abc");
  });

  it("surfaces ErrorBody.code in the thrown error", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"code":"task_not_found","message":"nope"}', {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(httpPraxisClient.history("t1")).rejects.toThrow(/task_not_found/);
  });

  it("throws a PraxisError carrying status + code", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"code":"not_pending","message":"x"}', {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(httpPraxisClient.answer("t1", "q1", "y")).rejects.toMatchObject({
      name: "PraxisError",
      status: 409,
      code: "not_pending",
    });
  });
});

describe("httpPraxisClient.listTasks/getTask", () => {
  it("GETs /api/praxis/v1/tasks with paging params", async () => {
    const spy = vi.fn<(input: Request | string, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ items: [{ id: "a", status: "running" }], next_cursor: "c2" }), {
        status: 200, headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    const page = await httpPraxisClient.listTasks({ limit: 20, cursor: "c1" });
    expect(page.items).toHaveLength(1);
    expect(page.next_cursor).toBe("c2");
    const arg = spy.mock.calls[0][0] as Request | string;
    const urlStr = typeof arg === "string" ? arg : (arg as Request).url;
    const url = new URL(urlStr, "http://x");
    expect(url.pathname).toBe("/api/praxis/v1/tasks");
  });

  it("GETs /api/praxis/v1/tasks/{id} for getTask", async () => {
    const spy = vi.fn<(input: Request | string, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ id: "t1", status: "completed" }), {
        status: 200, headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    const summary = await httpPraxisClient.getTask("t1");
    expect(summary.id).toBe("t1");
    const arg = spy.mock.calls[0][0] as Request | string;
    const urlStr = typeof arg === "string" ? arg : (arg as Request).url;
    const url = new URL(urlStr, "http://x");
    expect(url.pathname).toBe("/api/praxis/v1/tasks/t1");
  });
});
