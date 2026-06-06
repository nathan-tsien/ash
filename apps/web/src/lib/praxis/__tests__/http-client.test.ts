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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("httpPraxisClient", () => {
  it("createTask POSTs to /api/praxis/tasks and returns the summary", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(
      new Response('{"id":"t1","status":"draft"}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const summary = await httpPraxisClient.createTask({ user_input: "hi", title: "hi" });

    expect(summary).toEqual({ id: "t1", status: "draft" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/praxis/tasks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ user_input: "hi", title: "hi" });
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
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/praxis/tasks/t1/start");
    expect(JSON.parse(init.body)).toEqual({ user_input: "do it" });
  });

  it("complete POSTs and tolerates a 204 with no body", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(httpPraxisClient.complete("t1")).resolves.toBeUndefined();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/praxis/tasks/t1/complete");
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
    expect(fetchFn.mock.calls[0][0]).toBe("/api/praxis/tasks/t1/events");
  });

  it("throws when a control call returns a non-2xx status", async () => {
    const fetchFn = stubFetch();
    fetchFn.mockResolvedValue(new Response('{"error":"boom"}', { status: 500 }));

    await expect(httpPraxisClient.createTask({ user_input: "x" })).rejects.toThrow();
  });
});
