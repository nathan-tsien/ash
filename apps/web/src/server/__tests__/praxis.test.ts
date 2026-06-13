import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// server/praxis imports "server-only" (throws outside a server bundle) and
// "./auth" (pulls next/headers). Stub both for the unit test.
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({
  getAccessTokenWithRefresh: vi.fn(),
}));

import { forwardToPraxis } from "@/server/praxis";
import { getAccessTokenWithRefresh } from "@/server/auth";

const mockToken = getAccessTokenWithRefresh as ReturnType<typeof vi.fn>;

function fetchMock() {
  const fn = vi.fn();
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  mockToken.mockResolvedValue("jwt-123");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("forwardToPraxis", () => {
  // --- allowlist ---

  it("404s a path outside the tasks allowlist without calling praxis", async () => {
    const fetchFn = fetchMock();
    const req = new Request("http://localhost/api/praxis/v1/projects", { method: "POST" });

    const res = await forwardToPraxis(req, ["v1", "projects"]);

    expect(res.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("404s when segments root is not v1 (old-style path)", async () => {
    const fetchFn = fetchMock();
    const req = new Request("http://localhost/api/praxis/tasks", { method: "POST" });

    const res = await forwardToPraxis(req, ["tasks"]);

    expect(res.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("401s when there is no session", async () => {
    const fetchFn = fetchMock();
    mockToken.mockResolvedValue(undefined);
    const req = new Request("http://localhost/api/praxis/v1/tasks", { method: "POST" });

    const res = await forwardToPraxis(req, ["v1", "tasks"]);

    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // --- transparent forwarding (no double /v1) ---

  it("forwards /api/praxis/v1/tasks/... 1:1 to PRAXIS_BASE_URL (no double /v1)", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    const req = new Request("http://app/api/praxis/v1/tasks?limit=2", { method: "GET" });

    await forwardToPraxis(req, ["v1", "tasks"]);

    const calledUrl = String(fetchFn.mock.calls[0][0]);
    expect(calledUrl).toContain("/v1/tasks?limit=2");
    expect(calledUrl).not.toContain("/v1/v1/");
  });

  it("forwards a control-plane POST with the bearer token and passes the body through", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response('{"id":"t1","status":"draft"}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    const req = new Request("http://localhost/api/praxis/v1/tasks", {
      method: "POST",
      body: '{"user_input":"hi"}',
    });

    const res = await forwardToPraxis(req, ["v1", "tasks"]);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "t1", status: "draft" });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8091/v1/tasks");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer jwt-123");
    expect(init.body).toBe('{"user_input":"hi"}');
  });

  it("passes a 204 through with an empty body", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }));
    const req = new Request("http://localhost/api/praxis/v1/tasks/t1/complete", { method: "POST" });

    const res = await forwardToPraxis(req, ["v1", "tasks", "t1", "complete"]);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("returns 499 (not a thrown 500) when the client aborts mid-forward", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockRejectedValue(new DOMException("aborted", "AbortError"));
    // jsdom's Request rejects undici's AbortSignal instance; fetch is mocked, so
    // a minimal GET stand-in exercises the aborted-signal branch faithfully.
    const req = {
      method: "GET",
      url: "http://localhost/api/praxis/v1/tasks/t1/events",
      signal: { aborted: true },
    } as unknown as Request;

    const res = await forwardToPraxis(req, ["v1", "tasks", "t1", "events"]);

    expect(res.status).toBe(499);
  });

  it("returns 502 when praxis is unreachable", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockRejectedValue(new TypeError("fetch failed"));
    const req = new Request("http://localhost/api/praxis/v1/tasks", { method: "POST" });

    const res = await forwardToPraxis(req, ["v1", "tasks"]);

    expect(res.status).toBe(502);
  });

  it("forwards the query string (e.g. history cursor) to praxis", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response('{"items":[]}', { status: 200, headers: { "content-type": "application/json" } }),
    );
    const req = new Request(
      "http://localhost/api/praxis/v1/tasks/t1/history?cursor=abc&limit=50",
      { method: "GET" },
    );

    const res = await forwardToPraxis(req, ["v1", "tasks", "t1", "history"]);

    expect(res.status).toBe(200);
    expect(fetchFn.mock.calls[0][0]).toBe(
      "http://localhost:8091/v1/tasks/t1/history?cursor=abc&limit=50",
    );
  });

  it("streams an events GET through as text/event-stream", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response('data: {"type":"turn_started"}\n\n', {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );
    const req = new Request("http://localhost/api/praxis/v1/tasks/t1/events", { method: "GET" });

    const res = await forwardToPraxis(req, ["v1", "tasks", "t1", "events"]);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8091/v1/tasks/t1/events");
    expect((init.headers as Record<string, string>).accept).toBe("text/event-stream");
  });
});
