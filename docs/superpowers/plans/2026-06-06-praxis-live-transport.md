# Praxis Live Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the praxis `PraxisTaskClient` to a real praxis backend over HTTP via a browser `httpPraxisClient` and a same-origin BFF catch-all proxy that forwards the iam JWT, so flipping `NEXT_PUBLIC_PRAXIS_TRANSPORT=http` runs the workbench against a deployed praxis with no reducer/provider/UI change.

**Architecture:** The iam JWT lives in an httpOnly cookie unreadable by browser JS, so every browser→praxis call goes through a same-origin `/api/praxis/[...segments]` route handler that reads the cookie server-side, attaches `Authorization: Bearer`, and forwards to praxis — passing control-plane JSON through and piping the SSE event stream straight back. `httpPraxisClient` parses that SSE stream into `RuntimeEvent`s with an incremental parser. Build-to-contract: the `fake` client stays the default, verified by unit tests + a mocked upstream (no live praxis yet).

**Tech Stack:** Next.js 16 route handlers (Node runtime), TypeScript (strict), vitest + jsdom, `fetch` + `ReadableStream` for SSE, existing `server/auth.ts` cookie/refresh helpers.

**Spec:** `docs/superpowers/specs/2026-06-06-praxis-live-transport.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `apps/web/src/lib/praxis/sse.ts` | **New.** Incremental SSE frame parser (bytes-as-string → data payloads). Pure. |
| `apps/web/src/lib/praxis/__tests__/sse.test.ts` | **New.** Parser unit tests. |
| `apps/web/src/server/auth.ts` | **Edit.** Add `getAccessTokenWithRefresh()`. |
| `apps/web/src/server/praxis.ts` | **New.** `forwardToPraxis()` + `PRAXIS_BASE_URL`. |
| `apps/web/src/app/api/praxis/[...segments]/route.ts` | **New.** Thin catch-all `GET`/`POST` handlers. |
| `apps/web/src/server/__tests__/praxis.test.ts` | **New.** Proxy forward/allowlist/auth/SSE tests. |
| `apps/web/src/lib/praxis/http-client.ts` | **Implement.** Replace throwing scaffold with the real client. |
| `apps/web/src/lib/praxis/__tests__/http-client.test.ts` | **New.** Client unit tests (mocked fetch). |
| `apps/web/src/lib/praxis/client.ts` | **Edit.** Add `signal?` to `streamEvents`; env-flag selection. |
| `apps/web/src/components/workbench/task-run-provider.tsx` | **Edit.** `AbortController` per run; pass signal; abort outstanding on unmount. |
| `docs/adr/0012-praxis-live-transport.md` | **New.** ADR for the transport + proxy decisions. |
| `docs/adr/0007-transport-sse-vs-websocket.md`, `0011-...md`, `docs/adr/README.md` | **Edit.** Status notes pointing to ADR-0012. |

Note on `fake-client.ts`: a zero-arg generator is structurally assignable to `streamEvents(id, signal?)`, so `fakePraxisClient` needs **no** change — it already satisfies the widened interface and ignores the signal.

All commands run from the repo root unless noted. Test command for a single file:
`pnpm --filter @ash/web exec vitest run <path>`

---

## Task 1: SSE frame parser

**Files:**
- Create: `apps/web/src/lib/praxis/sse.ts`
- Test: `apps/web/src/lib/praxis/__tests__/sse.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/praxis/__tests__/sse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SseParser } from "../sse";

describe("SseParser", () => {
  it("parses a single complete frame", () => {
    const p = new SseParser();
    expect(p.push('data: {"type":"turn_started"}\n\n')).toEqual(['{"type":"turn_started"}']);
  });

  it("buffers a frame split across chunks", () => {
    const p = new SseParser();
    expect(p.push('data: {"type":"text_')).toEqual([]);
    expect(p.push('delta","chunk":"hi"}\n\n')).toEqual(['{"type":"text_delta","chunk":"hi"}']);
  });

  it("emits multiple frames from one chunk", () => {
    const p = new SseParser();
    expect(p.push("data: a\n\ndata: b\n\n")).toEqual(["a", "b"]);
  });

  it("concatenates multiple data lines with a newline", () => {
    const p = new SseParser();
    expect(p.push("data: line1\ndata: line2\n\n")).toEqual(["line1\nline2"]);
  });

  it("ignores comment/heartbeat lines and frames with no data", () => {
    const p = new SseParser();
    expect(p.push(': keep-alive\n\ndata: {"type":"turn_completed"}\n\n')).toEqual([
      '{"type":"turn_completed"}',
    ]);
  });

  it("normalizes CRLF line endings", () => {
    const p = new SseParser();
    expect(p.push("data: x\r\n\r\n")).toEqual(["x"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/sse.test.ts`
Expected: FAIL — cannot find module `../sse` / `SseParser is not defined`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/lib/praxis/sse.ts`:

```ts
/**
 * Incremental Server-Sent-Events frame parser.
 *
 * Feed decoded string chunks via `push`; it returns the `data` payload of every
 * frame that completed in that chunk (frames are separated by a blank line).
 * A partial trailing frame is retained until a later `push` completes it.
 *
 * Scope: only `data:` fields are surfaced (each praxis frame's data is one JSON
 * `RuntimeEvent`). `event:`/`id:` fields and `:`-comment heartbeats are ignored.
 * The caller is responsible for `JSON.parse`-ing each returned payload.
 */
export class SseParser {
  private buffer = "";

  push(chunk: string): string[] {
    // Normalize CRLF on the accumulated buffer so a `\r\n` split across chunk
    // boundaries still collapses correctly.
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, "\n");

    const payloads: string[] = [];
    let sep: number;
    while ((sep = this.buffer.indexOf("\n\n")) !== -1) {
      const frame = this.buffer.slice(0, sep);
      this.buffer = this.buffer.slice(sep + 2);
      const data = this.parseFrame(frame);
      if (data !== null) payloads.push(data);
    }
    return payloads;
  }

  private parseFrame(frame: string): string | null {
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue; // comment / heartbeat
      if (line.startsWith("data:")) {
        // A single leading space after the colon is part of the framing, not data.
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      // event:/id: fields are not used this slice.
    }
    return dataLines.length > 0 ? dataLines.join("\n") : null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/sse.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/sse.ts apps/web/src/lib/praxis/__tests__/sse.test.ts
git commit -m "feat(praxis): incremental SSE frame parser"
```

---

## Task 2: `getAccessTokenWithRefresh` auth helper

**Files:**
- Modify: `apps/web/src/server/auth.ts` (append a function near `refreshAccessToken`, end of file)

This is a thin composition of existing, already-working helpers (`getAccessToken`, `refreshAccessToken`); it is exercised through the proxy test in Task 3 (which mocks the auth module), so it gets no brittle `next/headers` cookie-mock test of its own.

- [ ] **Step 1: Add the helper**

Append to `apps/web/src/server/auth.ts`:

```ts
/** Return the current access token, refreshing once if the cookie is absent.
 *  Returns undefined if there is no valid session. Use from BFF proxy routes
 *  that forward the iam JWT to downstream services (e.g. praxis).
 */
export async function getAccessTokenWithRefresh(): Promise<string | undefined> {
  const existing = await getAccessToken();
  if (existing) return existing;

  const user = await refreshAccessToken();
  if (!user) return undefined;

  // refreshAccessToken set fresh cookies on the same request's jar; re-read it.
  return getAccessToken();
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @ash/web exec tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/server/auth.ts
git commit -m "feat(auth): getAccessTokenWithRefresh helper for BFF proxying"
```

---

## Task 3: BFF catch-all proxy

**Files:**
- Create: `apps/web/src/server/praxis.ts`
- Create: `apps/web/src/app/api/praxis/[...segments]/route.ts`
- Test: `apps/web/src/server/__tests__/praxis.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/server/__tests__/praxis.test.ts`:

```ts
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
  it("404s a path outside the tasks allowlist without calling praxis", async () => {
    const fetchFn = fetchMock();
    const req = new Request("http://localhost/api/praxis/projects", { method: "POST" });

    const res = await forwardToPraxis(req, ["projects"]);

    expect(res.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("401s when there is no session", async () => {
    const fetchFn = fetchMock();
    mockToken.mockResolvedValue(undefined);
    const req = new Request("http://localhost/api/praxis/tasks", { method: "POST" });

    const res = await forwardToPraxis(req, ["tasks"]);

    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("forwards a control-plane POST with the bearer token and passes the body through", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response('{"id":"t1","status":"draft"}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    const req = new Request("http://localhost/api/praxis/tasks", {
      method: "POST",
      body: '{"user_input":"hi"}',
    });

    const res = await forwardToPraxis(req, ["tasks"]);

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
    const req = new Request("http://localhost/api/praxis/tasks/t1/complete", { method: "POST" });

    const res = await forwardToPraxis(req, ["tasks", "t1", "complete"]);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("streams an events GET through as text/event-stream", async () => {
    const fetchFn = fetchMock();
    fetchFn.mockResolvedValue(
      new Response('data: {"type":"turn_started"}\n\n', {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );
    const req = new Request("http://localhost/api/praxis/tasks/t1/events", { method: "GET" });

    const res = await forwardToPraxis(req, ["tasks", "t1", "events"]);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8091/v1/tasks/t1/events");
    expect((init.headers as Record<string, string>).accept).toBe("text/event-stream");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ash/web exec vitest run src/server/__tests__/praxis.test.ts`
Expected: FAIL — cannot find module `@/server/praxis`.

- [ ] **Step 3: Write the proxy module**

Create `apps/web/src/server/praxis.ts`:

```ts
import "server-only";

import { getAccessTokenWithRefresh } from "./auth";

/** praxis HTTP base URL. Server-only; distinct default from iam's 8090. */
const PRAXIS_BASE_URL = process.env.PRAXIS_BASE_URL ?? "http://localhost:8091";

/** Only `/v1/tasks/**` is proxied. Keeps this from being an open proxy. */
const ALLOWED_ROOT = "tasks";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Forward a browser request to praxis, attaching the iam JWT from the httpOnly
 * cookie as a Bearer header. Control-plane responses pass through (status +
 * JSON body); the SSE `/events` response body is piped straight back.
 *
 * Speaks HTTP only — does not import cogito or any praxis Rust crate.
 */
export async function forwardToPraxis(request: Request, segments: string[]): Promise<Response> {
  if (segments[0] !== ALLOWED_ROOT) {
    return json({ error: "not_found" }, 404);
  }

  const token = await getAccessTokenWithRefresh();
  if (!token) {
    return json({ error: "unauthenticated" }, 401);
  }

  const isSse = segments[segments.length - 1] === "events";
  const url = `${PRAXIS_BASE_URL}/v1/${segments.join("/")}`;
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  const init: RequestInit = { method: request.method, headers, signal: request.signal };

  if (request.method === "POST") {
    headers["content-type"] = "application/json";
    const body = await request.text();
    if (body) init.body = body;
  }
  if (isSse) headers["accept"] = "text/event-stream";

  const upstream = await fetch(url, init);

  if (isSse) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  // Control plane: pass status + body through. 204/empty bodies stay empty.
  const text = await upstream.text();
  return new Response(text || null, {
    status: upstream.status,
    headers: text ? { "content-type": "application/json" } : {},
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web exec vitest run src/server/__tests__/praxis.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the route handler**

Create `apps/web/src/app/api/praxis/[...segments]/route.ts`:

```ts
import { forwardToPraxis } from "@/server/praxis";

// Cookies + SSE body streaming require the Node runtime and no caching.
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ segments: string[] }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { segments } = await params;
  return forwardToPraxis(request, segments);
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { segments } = await params;
  return forwardToPraxis(request, segments);
}
```

- [ ] **Step 6: Verify typecheck**

Run: `pnpm --filter @ash/web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server/praxis.ts "apps/web/src/app/api/praxis/[...segments]/route.ts" apps/web/src/server/__tests__/praxis.test.ts
git commit -m "feat(praxis): BFF catch-all proxy forwarding iam JWT to praxis"
```

---

## Task 4: `httpPraxisClient`

**Files:**
- Modify (replace contents): `apps/web/src/lib/praxis/http-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/http-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/praxis/__tests__/http-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/http-client.test.ts`
Expected: FAIL — current scaffold throws "not enabled" for every method.

- [ ] **Step 3: Replace the scaffold with the real client**

Replace the entire contents of `apps/web/src/lib/praxis/http-client.ts`:

```ts
import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";
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

async function postJson<T>(url: string, body?: unknown): Promise<T | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`praxis POST ${url} -> ${res.status}`);
  if (res.status === 204) return undefined;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : undefined;
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
    } finally {
      reader.releaseLock();
    }
  },

  async sendMessage(id: string, text: string): Promise<void> {
    await postJson(`${BASE}/${id}/messages`, { text });
  },

  async complete(id: string): Promise<void> {
    await postJson(`${BASE}/${id}/complete`);
  },

  async cancel(id: string): Promise<void> {
    await postJson(`${BASE}/${id}/cancel`);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis/__tests__/http-client.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/http-client.ts apps/web/src/lib/praxis/__tests__/http-client.test.ts
git commit -m "feat(praxis): real httpPraxisClient over the BFF proxy"
```

---

## Task 5: Interface signal + env-flag client selection

**Files:**
- Modify: `apps/web/src/lib/praxis/client.ts`

- [ ] **Step 1: Add the AbortSignal param to the interface**

In `apps/web/src/lib/praxis/client.ts`, change the `streamEvents` interface line:

```ts
  /** GET /v1/tasks/{id}/events (SSE) — yields RuntimeEvents until the turn ends */
  streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent>;
```

- [ ] **Step 2: Switch the factory to env-flag selection**

In the same file, add the import and replace `getPraxisClient`:

```ts
import { fakePraxisClient } from "./fake-client";
import { httpPraxisClient } from "./http-client";
```

```ts
/**
 * Returns the active praxis client. Default = fake. Set
 * NEXT_PUBLIC_PRAXIS_TRANSPORT=http to run against a real praxis through the BFF
 * proxy (ADR-0012). The flag is NEXT_PUBLIC_ because the client is constructed
 * in the browser (TaskRunProvider).
 */
export function getPraxisClient(): PraxisTaskClient {
  return process.env.NEXT_PUBLIC_PRAXIS_TRANSPORT === "http" ? httpPraxisClient : fakePraxisClient;
}
```

(Note: `PraxisTaskClient`, `CreateTaskRequest`, `RuntimeEvent`, `TaskSummary` are already imported at the top of the file; keep those imports.)

- [ ] **Step 3: Verify typecheck + full praxis test run**

Run: `pnpm --filter @ash/web exec tsc --noEmit`
Expected: PASS — `fakePraxisClient`'s zero-arg `streamEvents` is still assignable to the widened signature.

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis`
Expected: PASS — including the pre-existing `fake-run.test.ts` (unchanged behavior).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/praxis/client.ts
git commit -m "feat(praxis): env-flag client selection + AbortSignal on streamEvents"
```

---

## Task 6: Abort outstanding streams in `TaskRunProvider`

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`

Wire an `AbortController` per run, pass its signal to `streamEvents`, drop it once the run settles, and abort any still-open controllers when the provider unmounts (defends against a leaked real SSE connection; a no-op for the fake).

- [ ] **Step 1: Add a controllers ref + unmount cleanup**

Add `useEffect` to the React import in `task-run-provider.tsx`:

```ts
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
```

Inside `TaskRunProvider`, after the `clientRef` line, add:

```ts
  const controllersRef = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, []);
```

- [ ] **Step 2: Use a controller in the run loop**

In `startTask`, replace the streaming IIFE (`void (async () => { ... })();`) with:

```ts
      const controller = new AbortController();
      controllersRef.current.add(controller);
      void (async () => {
        let state = initialTaskRunState({ ...seeded, status: "running" });
        try {
          await client.startTask(summary.id, directive);
          upsert(state.task);
          for await (const event of client.streamEvents(summary.id, controller.signal)) {
            state = runtimeEventReducer(state, event, Date.now());
            upsert(state.task);
          }
          // One-shot task: settle the praxis FSM (paused -> completed) and release
          // the session. Fake client no-ops; real client POSTs /complete.
          await client.complete(summary.id);
        } catch {
          upsert({ ...state.task, status: "failed" });
        } finally {
          controllersRef.current.delete(controller);
        }
      })();
```

- [ ] **Step 3: Verify typecheck + build**

Run: `pnpm --filter @ash/web exec tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter @ash/web exec vitest run src/lib/praxis`
Expected: PASS (existing fake-run integration test still green — provider change is transparent to it).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx
git commit -m "feat(praxis): abort outstanding task streams on provider unmount"
```

---

## Task 7: Documentation — ADR-0012 + status updates

**Files:**
- Create: `docs/adr/0012-praxis-live-transport.md`
- Modify: `docs/adr/0007-transport-sse-vs-websocket.md`, `docs/adr/0011-praxis-contract-and-live-task-execution.md`, `docs/adr/README.md`

- [ ] **Step 1: Write ADR-0012**

Create `docs/adr/0012-praxis-live-transport.md`:

```markdown
# ADR-0012: Real praxis transport and the BFF SSE proxy

## Status

Accepted (2026-06-06)

## Context

ADR-0011 shipped the praxis execution pipeline (client interface, reducer, provider, UI) driven by a local
fake, and explicitly deferred the real transport: the `httpPraxisClient` and the BFF SSE proxy route that
ADR-0007 identified as the gated Phase 2 piece. This ADR records the decisions for that real-transport slice
(`docs/superpowers/specs/2026-06-06-praxis-live-transport.md`).

The shaping constraint: the iam access token lives in an httpOnly cookie (`server/auth.ts`), so browser
JavaScript cannot attach `Authorization: Bearer` to any praxis request — not only the SSE stream ADR-0007
called out, but the control-plane POSTs too.

## Decision

1. **Proxy everything through a same-origin BFF.** Every browser->praxis call goes to `/api/praxis/...`; the
   browser fetch carries the httpOnly cookie automatically, and the route reads it, attaches the Bearer
   header, and forwards to praxis. The JWT never reaches browser-readable storage.

2. **One catch-all route with a `tasks/` allowlist.** A single `app/api/praxis/[...segments]/route.ts`
   (`GET` + `POST`) forwards any method/body, keeping the swap to real praxis mechanical. It rejects any
   path whose first segment is not `tasks`, so it is not an open proxy. Logic lives in `server/praxis.ts`
   (`forwardToPraxis`, `PRAXIS_BASE_URL` default `http://localhost:8091`); the route file stays thin.

3. **Pipe the SSE body through; parse on the client.** For `/events` the route returns the upstream
   `text/event-stream` body unbuffered. `httpPraxisClient` parses frames with an incremental `SseParser`
   (fetch + ReadableStream, not `EventSource` — abortable, no auto-reconnect, fits the `AsyncIterable`).

4. **Env-flag selection, fake stays default.** `getPraxisClient()` returns `httpPraxisClient` only when
   `NEXT_PUBLIC_PRAXIS_TRANSPORT=http`; otherwise the fake. Nothing in dev/CI changes until someone opts in.

5. **Build-to-contract.** No deployed praxis exists yet, so correctness rests on the OpenAPI contract plus
   unit tests (SSE parser, client with mocked fetch, proxy with mocked upstream). Live end-to-end is
   deferred.

6. **No reconnection this slice.** A dropped stream surfaces as a failed task; `Last-Event-ID` resume and a
   replay buffer are deferred.

7. **AbortSignal plumbing.** `streamEvents(id, signal?)` threads an `AbortController` from
   `TaskRunProvider` so an abandoned real SSE connection is torn down on unmount. The fake ignores it.

## Consequences

- **Easier:** Pointing ash at a real praxis is `NEXT_PUBLIC_PRAXIS_TRANSPORT=http` + `PRAXIS_BASE_URL`; the
  reducer, provider, and UI are untouched.
- **Boundary preserved:** the proxy speaks HTTP only — no cogito/praxis-crate import enters `apps/web`.
- **Surface to watch:** the catch-all is mitigated by the `tasks/` allowlist; widen deliberately (e.g.
  `projects/`) if more namespaces are proxied.
- **Deferred:** live verification, SSE reconnection/resume, server-side run persistence, Project live
  execution, single-Task multi-turn UI.

## Related

- `docs/superpowers/specs/2026-06-06-praxis-live-transport.md`
- ADR-0007 (transport = SSE; this lands its gated proxy), ADR-0011 (praxis contract + fake slice)
- praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)
```

- [ ] **Step 2: Add a status note to ADR-0007**

In `docs/adr/0007-transport-sse-vs-websocket.md`, immediately after the `## Update (2026-06-03) — decision locked to SSE` section's final paragraph (the one ending "...and **does not** implement the SSE route yet."), append a new line:

```markdown

## Update (2026-06-06) — BFF SSE proxy landed

The gated proxy route is now implemented (ADR-0012): a same-origin catch-all `/api/praxis/[...segments]`
forwards the iam JWT and re-streams praxis's `text/event-stream`. Still SSE + POST control plane, exactly as
locked here.
```

- [ ] **Step 3: Add a status note to ADR-0011**

In `docs/adr/0011-praxis-contract-and-live-task-execution.md`, under `## Consequences`, change the
`- **Deferred:** real SSE transport + BFF proxy, ...` line to:

```markdown
- **Deferred (partially resolved):** real SSE transport + BFF proxy landed in ADR-0012 (2026-06-06);
  server-side persistence, Project live execution, and real `.pptx` rendering remain deferred.
```

- [ ] **Step 4: Index ADR-0012 in the README**

In `docs/adr/README.md`, add a table row to the `## Index` table immediately after the ADR-0011 row:

```markdown
| [0012](./0012-praxis-live-transport.md) | Real praxis transport + BFF SSE proxy |
```

Also update the `### Reserved band` line, which currently reads "Next free IDs (**0012+**) ...", to start at
**0013+**:

```markdown
Next free IDs (**0013+**) cover workspace extension packs, mobile IA, etc. — claim sequentially here when filing.
```

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0012-praxis-live-transport.md docs/adr/0007-transport-sse-vs-websocket.md docs/adr/0011-praxis-contract-and-live-task-execution.md docs/adr/README.md
git commit -m "docs(adr): ADR-0012 real praxis transport + BFF proxy; advance 0007/0011"
```

---

## Task 8: Full gate verification

**Files:** none (verification only)

- [ ] **Step 1: Lint, typecheck, test, build**

Run each from the repo root and confirm all pass:

```bash
pnpm --filter @ash/web exec vitest run
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all green. The new tests (SSE parser, http client, proxy) and the pre-existing `fake-run.test.ts`
pass; lint/typecheck/build are clean.

- [ ] **Step 2: Final review against the spec**

Confirm each spec section maps to shipped code: `httpPraxisClient` (Task 4), BFF catch-all proxy (Task 3),
SSE parser (Task 1), env-flag selection (Task 5), AbortSignal plumbing (Tasks 5–6), tests (Tasks 1/3/4),
docs (Task 7). No deferred item was silently implemented; no in-scope item was missed.

- [ ] **Step 3: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to choose how to integrate `feat/praxis-live-transport`
(PR vs. merge), per the repo's finish checklist (AGENTS.md §What to do when you finish).
```
