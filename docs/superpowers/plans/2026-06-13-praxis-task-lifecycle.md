# Praxis Task Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire ash's task business flow end-to-end against the praxis contract — list existing tasks, deep-link cold-load a single task, cancel a running task, and send multi-turn follow-up messages — with every HTTP call bound to generated OpenAPI types.

**Architecture:** The praxis OpenAPI contract is the single source of truth. praxis is a PRIVATE repo, so `sync:praxis` pulls the contract at a pinned `openapi-vX.Y.Z` tag via the authenticated `gh` CLI into a committed vendored snapshot; `gen:praxis` generates the typed client from that snapshot (offline, no auth); CI's `gen:praxis:check` fails on drift between the committed client and the vendored contract, and `sync:praxis:check` (manual, needs gh) verifies the snapshot still matches the tag. All non-SSE calls go through one `openapi-fetch` client bound to the generated `paths` (browser → same-origin BFF; RSC → direct to praxis, server-to-server, no CORS). SSE (`streamEvents`) stays hand-written but consumes the generated `RuntimeEvent` union. The BFF becomes a transparent allowlisted forwarder so contract paths (`/v1/...`) line up on both sides.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, `openapi-typescript` + `openapi-fetch`, Vitest, next-intl, Tailwind/Radix UI (`@ash/ui`), pnpm + Turborepo.

---

## Locked decisions (from 2026-06-13 brainstorming)

1. **All APIs via codegen, contract-first.** SSE is the single hand-written exception (still consumes generated types).
2. **Task lifecycle DoD = four capabilities:** list `GET /v1/tasks`, deep-link cold-load `GET /v1/tasks/{id}`, cancel UI `POST /v1/tasks/{id}/cancel`, multi-turn `POST /v1/tasks/{id}/messages`.
3. **Contract source:** praxis is private → `sync:praxis` pulls the pinned tag via authenticated `gh` into a vendored snapshot; `gen:praxis` generates from the snapshot; CI `gen:praxis:check` enforces no drift. (Confirmed: vendored snapshot is byte-identical to tag `openapi-v0.1.5`.)
4. **RSC fetch:** direct to `PRAXIS_BASE_URL` (server JWT); browser via BFF. One client factory, two base URLs.
5. **projects out of scope this round** (task-first).
6. **fake-first:** every UI/transport task is validated against `fakePraxisClient` before the http transport is switched on.

## Transport boundary (CORS note — record in spec)

CORS is browser-enforced only. Browser never hits praxis directly; it calls same-origin `/api/praxis/...` (BFF). RSC calls praxis directly server-to-server, which CORS does not govern. Therefore no praxis CORS configuration is required in dev or prod. `server/*` modules carry `import "server-only"` so the direct client can never be bundled into the browser.

## File structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/package.json` | `gen:praxis` script → upstream tag URL | Modify |
| `.github/workflows/ci.yml` | contract drift check step | Modify |
| `apps/web/src/lib/praxis/contract/praxis.yaml`, `schemas.json` | vendored contract snapshot (now provenance-pinned) | Keep |
| `apps/web/src/lib/praxis/generated.ts` | generated types (regenerated) | Regenerate |
| `apps/web/src/lib/praxis/openapi-fetch-client.ts` | `createClient<paths>` factory (browser + server base URLs, auth middleware) | Create |
| `apps/web/src/lib/praxis/status-map.ts` | `praxisToAshStatus` pure mapping | Create |
| `apps/web/src/lib/praxis/summary-projection.ts` | `summaryToTask` pure projection (list/get → card Task) | Create |
| `apps/web/src/lib/praxis/client.ts` | `PraxisTaskClient` interface (+ `listTasks`, `getTask`) | Modify |
| `apps/web/src/lib/praxis/http-client.ts` | real transport via openapi-fetch (control plane) + hand-written SSE | Modify |
| `apps/web/src/lib/praxis/fake-client.ts` | fake `listTasks`/`getTask`, scripted multi-turn | Modify |
| `apps/web/src/server/praxis-client.ts` | server-side direct client (getAccessTokenWithRefresh + direct base URL) | Create |
| `apps/web/src/server/praxis.ts` | BFF transparent forwarder + rekeyed allowlist | Modify |
| `apps/web/src/server/tasks.ts` | real `listTasks`/`getActiveTask` via server client | Modify |
| `apps/web/src/components/workbench/task-run-provider.tsx` | seed-from-server, `cancel`, `sendFollowUp` | Modify |
| `apps/web/src/app/[locale]/(app)/app/tasks/page.tsx` | "view all tasks" paginated list page | Create |
| `apps/web/src/components/workbench/tasks/all-tasks-list.tsx` | client list w/ cursor "load more" + empty/error/loading | Create |
| `apps/web/src/components/workbench/chat/workbench-chat.tsx` | cancel button + follow-up composer enablement | Modify |
| `apps/web/src/components/workbench/sidebar/task-section.tsx` | "view all" link | Modify |
| `docs/adr/0016-contract-first-codegen-and-transport.md` | new ADR (codegen source + openapi-fetch + transparent BFF) | Create |
| `docs/adr/0011-...md`, `0012-...md`, `0015-...md` | revise/supersede affected clauses | Modify |
| `docs/superpowers/specs/2026-06-13-praxis-task-lifecycle.md` | design spec | Create |
| `docs/components/workbench-chat.md`, `workbench-sidebar.md` | per-pane contract updates | Modify |
| `ROADMAP.md` | move list/deep-link/cancel/multi-turn to done | Modify |

---

## Phase 0 — Docs first (ADR + spec)

### Task 0: Author ADR-0016 and the design spec

**Files:**
- Create: `docs/adr/0016-contract-first-codegen-and-transport.md`
- Create: `docs/superpowers/specs/2026-06-13-praxis-task-lifecycle.md`
- Modify: `docs/adr/0011-praxis-contract-and-live-task-execution.md` (multi-turn now in scope)
- Modify: `docs/adr/0012-*` (BFF becomes transparent forwarder)
- Modify: `docs/adr/0015-praxis-0.1.5-interactive-execution.md` (deep-link cold-load no longer deferred)

- [ ] **Step 1: Write ADR-0016** following the repo ADR template (`docs/adr/README.md`). Decision statement:
  - Context: pre-release; "all APIs via codegen, contract is source of truth."
  - Decision: (a) `gen:praxis` pulls from upstream praxis repo at a pinned `openapi-vX.Y.Z` tag; committed output is CI-verified against the tag. (b) All non-SSE praxis calls use one `openapi-fetch` client bound to generated `paths`; SSE stays hand-written consuming generated `RuntimeEvent`. (c) BFF is a transparent allowlisted forwarder (`/api/praxis/v1/<root>/...` → `PRAXIS_BASE_URL/v1/<root>/...`). (d) RSC calls praxis directly (server-to-server, no CORS); browser via BFF.
  - Consequences: contract drift fails CI; path typos caught at compile time; one SSE carve-out documented.
  - Supersedes: ADR-0011 §multi-turn-deferred, ADR-0015 §deep-link-deferred; revises ADR-0012 §proxy-path-scheme.
- [ ] **Step 2: Write the spec** `2026-06-13-praxis-task-lifecycle.md` covering: the four capabilities, transport boundary + CORS note (verbatim from this plan), the status mapping table (Phase 1 Task 4), and the fake-first validation order. Reference upstream source per `praxis-upstream-source` provenance.
- [ ] **Step 3: Edit the three affected ADRs** — add a `Superseded-by: ADR-0016` / `Revised-by: ADR-0016` note to the specific deferred clauses (do not rewrite whole ADRs).
- [ ] **Step 4: Commit**

```bash
git add docs/adr/0016-contract-first-codegen-and-transport.md docs/superpowers/specs/2026-06-13-praxis-task-lifecycle.md docs/adr/0011-*.md docs/adr/0012-*.md docs/adr/0015-*.md
git commit -m "docs(praxis): ADR-0016 contract-first codegen + transport; spec for task lifecycle"
```

---

## Phase 1 — Contract source + codegen alignment — DONE (controller, env-coupled)

praxis is a PRIVATE repo, so a public raw URL cannot be used in package.json/CI.
Implemented via the authenticated `gh` CLI instead. Done directly by the
controller (environment auth specifics); committed in the Phase-1 commit.

### Task 1 (done): gh-based contract sync + provenance

- `apps/web/scripts/sync-praxis-contract.sh` — pulls `openapi/praxis.yaml` +
  `openapi/schemas.json` at `PRAXIS_TAG` (default `openapi-v0.1.5`) via
  `gh api ... -H "Accept: application/vnd.github.raw"`; `--check` mode diffs the
  vendored snapshot against the tag without writing.
- `apps/web/package.json` scripts: `sync:praxis`, `sync:praxis:check`,
  `gen:praxis` (vendored → generated), `gen:praxis:check`.
- Verified: vendored `praxis.yaml`/`schemas.json` are byte-identical to tag
  `openapi-v0.1.5`; `gen:praxis` produces no diff. `openapi-fetch@^0.14.0` added
  to `@ash/web` deps (matches `@ash/iam-client`).

### Task 2 (done): CI codegen drift check

- `.github/workflows/ci.yml` runs `pnpm --filter @ash/web gen:praxis:check`
  after install (no auth/network needed — generated vs vendored).
- `sync:praxis:check` (vendored vs tag) is manual/periodic; it needs an
  authenticated `gh` against the private repo, so it is not in the default CI matrix.

---

## Phase 2 — Generated transport (client layer)

### Task 3: openapi-fetch client factory

**Files:**
- Create: `apps/web/src/lib/praxis/openapi-fetch-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/openapi-fetch-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createPraxisFetchClient } from "../openapi-fetch-client";

describe("createPraxisFetchClient", () => {
  it("issues contract paths against the given base url", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createPraxisFetchClient({ baseUrl: "/api/praxis", fetch: fetchMock });
    await client.GET("/v1/tasks", { params: { query: { limit: 20 } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://x");
    expect(url.pathname).toBe("/api/praxis/v1/tasks");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("injects a bearer token when an auth resolver is supplied", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const client = createPraxisFetchClient({
      baseUrl: "http://localhost:8091",
      fetch: fetchMock,
      getToken: async () => "tok-123",
    });
    await client.GET("/v1/tasks/{id}", { params: { path: { id: "00000000-0000-0000-0000-000000000000" } } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok-123");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test openapi-fetch-client`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

```ts
import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "./generated";

export interface PraxisFetchOptions {
  /** Browser: "/api/praxis" (same-origin BFF). Server: PRAXIS_BASE_URL (direct). */
  baseUrl: string;
  /** Server-only: resolves the iam JWT to attach as a Bearer header. */
  getToken?: () => Promise<string | null>;
  /** Injectable for tests. Defaults to global fetch. */
  fetch?: typeof fetch;
}

/**
 * Single openapi-fetch client bound to the generated praxis `paths`. Both the
 * browser transport (via BFF) and the server transport (direct) are built from
 * this — only baseUrl + auth differ. SSE is NOT served here (openapi-fetch does
 * not consume text/event-stream); see http-client.streamEvents.
 */
export function createPraxisFetchClient(opts: PraxisFetchOptions): Client<paths> {
  const client = createClient<paths>({
    baseUrl: opts.baseUrl,
    fetch: opts.fetch,
  });
  if (opts.getToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await opts.getToken!();
        if (token) request.headers.set("authorization", `Bearer ${token}`);
        return request;
      },
    };
    client.use(auth);
  }
  return client;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test openapi-fetch-client`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/openapi-fetch-client.ts apps/web/src/lib/praxis/__tests__/openapi-fetch-client.test.ts
git commit -m "feat(praxis): openapi-fetch client factory bound to generated paths"
```

### Task 4: praxis→ash status mapping

**Files:**
- Create: `apps/web/src/lib/praxis/status-map.ts`
- Test: `apps/web/src/lib/praxis/__tests__/status-map.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { praxisToAshStatus } from "../status-map";

describe("praxisToAshStatus", () => {
  it("maps every praxis status to an ash status", () => {
    expect(praxisToAshStatus("draft")).toBe("pending");
    expect(praxisToAshStatus("running")).toBe("running");
    expect(praxisToAshStatus("paused")).toBe("running");
    expect(praxisToAshStatus("awaiting_input")).toBe("awaiting_input");
    expect(praxisToAshStatus("completed")).toBe("completed");
    expect(praxisToAshStatus("failed")).toBe("failed");
    expect(praxisToAshStatus("cancelled")).toBe("failed");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test status-map`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { TaskStatus } from "@ash/shared";
import type { PraxisTaskStatus } from "./runtime-events";

/**
 * praxis lifecycle states -> ash view-model status. ash has no `paused`
 * (treated as running) and no `cancelled` (a terminal non-success -> `failed`).
 * Centralized so list/get projection and the stream_end reducer agree.
 */
export function praxisToAshStatus(status: PraxisTaskStatus): TaskStatus {
  switch (status) {
    case "draft":
      return "pending";
    case "running":
    case "paused":
      return "running";
    case "awaiting_input":
      return "awaiting_input";
    case "completed":
      return "completed";
    case "failed":
    case "cancelled":
      return "failed";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test status-map`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/status-map.ts apps/web/src/lib/praxis/__tests__/status-map.test.ts
git commit -m "feat(praxis): centralize praxis->ash task status mapping"
```

### Task 5: `summaryToTask` projection (list/get → card Task)

**Files:**
- Create: `apps/web/src/lib/praxis/summary-projection.ts`
- Test: `apps/web/src/lib/praxis/__tests__/summary-projection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { summaryToTask } from "../summary-projection";

describe("summaryToTask", () => {
  it("projects a list/get summary into a card-shaped Task", () => {
    const task = summaryToTask(
      { id: "11111111-1111-1111-1111-111111111111", title: "做个 PPT", status: "running", project_id: null },
      { ts: "2026-06-13T00:00:00.000Z", untitled: "未命名任务" },
    );
    expect(task.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(task.title).toBe("做个 PPT");
    expect(task.status).toBe("running");
    expect(task.projectId).toBeUndefined();
    expect(task.messages).toEqual([]);
    expect(task.artifacts).toEqual([]);
    expect(task.toolTraces).toEqual([]);
  });

  it("falls back to an untitled label and maps cancelled->failed", () => {
    const task = summaryToTask(
      { id: "22222222-2222-2222-2222-222222222222", title: null, status: "cancelled", project_id: "33333333-3333-3333-3333-333333333333" },
      { ts: "2026-06-13T00:00:00.000Z", untitled: "未命名任务" },
    );
    expect(task.title).toBe("未命名任务");
    expect(task.status).toBe("failed");
    expect(task.projectId).toBe("33333333-3333-3333-3333-333333333333");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test summary-projection`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { Task } from "@ash/shared";
import type { TaskSummary } from "./runtime-events";
import { praxisToAshStatus } from "./status-map";

export interface SummaryLabels {
  /** Caller-supplied timestamp (ts unavailable in scripts; inject from RSC/now). */
  ts: string;
  /** Label when the summary has no title. */
  untitled: string;
}

/**
 * Project a praxis TaskSummary (from list/get) into ash's Task view-model as a
 * CARD: identity + status only, with empty conversation/artifact/tool arrays.
 * Full hydration (messages, tools, artifacts) comes from /history projection
 * when a task detail view mounts. Pure + deterministic.
 */
export function summaryToTask(summary: TaskSummary, labels: SummaryLabels): Task {
  return {
    id: summary.id,
    title: summary.title ?? labels.untitled,
    description: "",
    status: praxisToAshStatus(summary.status),
    createdAt: labels.ts,
    updatedAt: labels.ts,
    projectId: summary.project_id ?? undefined,
    messages: [],
    artifacts: [],
    toolTraces: [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test summary-projection`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/summary-projection.ts apps/web/src/lib/praxis/__tests__/summary-projection.test.ts
git commit -m "feat(praxis): summaryToTask projection for list/get card tasks"
```

### Task 6: Extend `PraxisTaskClient` interface

**Files:**
- Modify: `apps/web/src/lib/praxis/client.ts`
- Modify: `apps/web/src/lib/praxis/runtime-events.ts` (export `TaskList`)

- [ ] **Step 1: Export `TaskList`** in `runtime-events.ts` (add to the existing re-exports):

```ts
export type TaskList = components["schemas"]["TaskList"];
```

- [ ] **Step 2: Add `listTasks` + `getTask` to the interface** in `client.ts` (insert into `PraxisTaskClient`, before `complete`):

```ts
  /** GET /v1/tasks — one page of the caller's tasks (newest-first). */
  listTasks(params?: { limit?: number; cursor?: string }): Promise<TaskList>;
  /** GET /v1/tasks/{id} — fetch a single task summary (deep-link cold load). */
  getTask(id: string): Promise<TaskSummary>;
```

- [ ] **Step 3: Update the import line** in `client.ts`:

```ts
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskList, TaskSummary } from "./runtime-events";
```

- [ ] **Step 4: typecheck (expected to FAIL — implementations missing)**

Run: `pnpm --filter @ash/web typecheck`
Expected: FAIL — `fakePraxisClient` and `httpPraxisClient` do not implement `listTasks`/`getTask`. This is the failing-test signal for Tasks 7–8.

### Task 7: Implement `listTasks`/`getTask` + openapi-fetch in `http-client.ts`

**Files:**
- Modify: `apps/web/src/lib/praxis/http-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/http-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { httpPraxisClient } from "../http-client";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

describe("httpPraxisClient.listTasks/getTask", () => {
  it("GETs /api/praxis/v1/tasks with paging params", async () => {
    const spy = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ id: "a", status: "running" }], next_cursor: "c2" }), {
        status: 200, headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    const page = await httpPraxisClient.listTasks({ limit: 20, cursor: "c1" });
    expect(page.items).toHaveLength(1);
    expect(page.next_cursor).toBe("c2");
    const url = new URL((spy.mock.calls[0][0] as Request).url ?? (spy.mock.calls[0][0] as string), "http://x");
    expect(url.pathname).toBe("/api/praxis/v1/tasks");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test http-client`
Expected: FAIL — `listTasks` is not a function.

- [ ] **Step 3: Rework `http-client.ts` to use the factory for the control plane.** Replace the hand-written `postJson`/`getJson` calls with the openapi-fetch client; keep `streamEvents` hand-written. Top of file:

```ts
import type { PraxisTaskClient } from "./client";
import type { CreateTaskRequest, RuntimeEvent, TaskHistoryPage, TaskList, TaskSummary } from "./runtime-events";
import { PraxisError } from "./errors";
import { SseParser } from "./sse";
import { createPraxisFetchClient } from "./openapi-fetch-client";

// Browser transport: same-origin BFF carries the httpOnly cookie automatically.
const api = createPraxisFetchClient({ baseUrl: "/api/praxis" });
const SSE_BASE = "/api/praxis/v1/tasks";

function unwrap<T>(res: { data?: T; error?: unknown; response: Response }, op: string): T {
  if (res.error || !res.response.ok) {
    const body = res.error as { code?: string } | undefined;
    throw new PraxisError(`praxis ${op} -> ${res.response.status}`, res.response.status, body?.code ?? "");
  }
  return res.data as T;
}
```

Then the methods (replace the existing object), e.g.:

```ts
export const httpPraxisClient: PraxisTaskClient = {
  async createTask(req: CreateTaskRequest): Promise<TaskSummary> {
    return unwrap(await api.POST("/v1/tasks", { body: req }), "createTask");
  },
  async startTask(id: string, userInput: string): Promise<TaskSummary> {
    return unwrap(await api.POST("/v1/tasks/{id}/start", { params: { path: { id } }, body: { user_input: userInput } }), "startTask");
  },
  async listTasks(params?: { limit?: number; cursor?: string }): Promise<TaskList> {
    return unwrap(await api.GET("/v1/tasks", { params: { query: { limit: params?.limit, cursor: params?.cursor } } }), "listTasks");
  },
  async getTask(id: string): Promise<TaskSummary> {
    return unwrap(await api.GET("/v1/tasks/{id}", { params: { path: { id } } }), "getTask");
  },
  async sendMessage(id: string, text: string): Promise<void> {
    unwrap(await api.POST("/v1/tasks/{id}/messages", { params: { path: { id } }, body: { text } }), "sendMessage");
  },
  async answer(id: string, askId: string, answer: string): Promise<void> {
    unwrap(await api.POST("/v1/tasks/{id}/answers", { params: { path: { id } }, body: { ask_id: askId, answer } }), "answer");
  },
  async history(id: string, cursor?: string): Promise<TaskHistoryPage> {
    return unwrap(await api.GET("/v1/tasks/{id}/history", { params: { path: { id }, query: { cursor } } }), "history");
  },
  async complete(id: string): Promise<void> {
    unwrap(await api.POST("/v1/tasks/{id}/complete", { params: { path: { id } } }), "complete");
  },
  async cancel(id: string): Promise<void> {
    unwrap(await api.POST("/v1/tasks/{id}/cancel", { params: { path: { id } } }), "cancel");
  },
  async *streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent> {
    // SSE is the one hand-written carve-out: openapi-fetch cannot read
    // text/event-stream. Still yields the generated RuntimeEvent union.
    const res = await fetch(`${SSE_BASE}/${id}/events`, { headers: { accept: "text/event-stream" }, signal });
    if (!res.ok || !res.body) throw new Error(`praxis events ${id} -> ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const data of parser.push(decoder.decode(value, { stream: true }))) yield JSON.parse(data) as RuntimeEvent;
      }
      for (const data of parser.push(decoder.decode())) yield JSON.parse(data) as RuntimeEvent;
      for (const data of parser.flush()) yield JSON.parse(data) as RuntimeEvent;
    } finally {
      reader.releaseLock();
    }
  },
};
```

Note: SSE path changed from `/api/praxis/tasks/...` to `/api/praxis/v1/tasks/...` to match the transparent BFF (Phase 3 Task 9).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test http-client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/http-client.ts apps/web/src/lib/praxis/client.ts apps/web/src/lib/praxis/runtime-events.ts apps/web/src/lib/praxis/__tests__/http-client.test.ts
git commit -m "feat(praxis): http transport via openapi-fetch + listTasks/getTask; SSE carve-out"
```

### Task 8: Implement `listTasks`/`getTask` + multi-turn in `fake-client.ts`

**Files:**
- Modify: `apps/web/src/lib/praxis/fake-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/fake-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { fakePraxisClient } from "../fake-client";

describe("fakePraxisClient.listTasks", () => {
  it("returns a seeded first page with a cursor, then the final page", async () => {
    const p1 = await fakePraxisClient.listTasks({ limit: 2 });
    expect(p1.items.length).toBeGreaterThan(0);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await fakePraxisClient.listTasks({ limit: 2, cursor: p1.next_cursor! });
    expect(p2.next_cursor).toBeNull();
  });

  it("getTask returns a summary for a seeded id", async () => {
    const page = await fakePraxisClient.listTasks();
    const id = page.items[0].id;
    const summary = await fakePraxisClient.getTask(id);
    expect(summary.id).toBe(id);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test fake-client`
Expected: FAIL — `listTasks` is not a function.

- [ ] **Step 3: Add seeded list data + methods.** In `fake-client.ts`, add after the `runs` map and update imports to include `TaskList`:

```ts
// Two seeded pages so the list UI exercises cursor pagination without a backend.
const SEED: TaskSummary[] = [
  { id: "seed-1", title: "生成季度汇报 PPT", status: "completed", project_id: null },
  { id: "seed-2", title: "整理用户访谈纪要", status: "running", project_id: null },
  { id: "seed-3", title: "竞品分析草稿", status: "awaiting_input", project_id: null },
  { id: "seed-4", title: "周报模板", status: "draft", project_id: null },
];
```

Replace the `sendMessage`/`history`/`cancel` stubs and add the new methods:

```ts
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
```

For multi-turn, make `sendMessage` push a scripted assistant reply into a follow-up stream the provider can read. Minimal version that keeps the contract shape (the provider re-subscribes for the reply):

```ts
  async sendMessage(id: string): Promise<void> {
    const run = runs.get(id);
    if (run) run.summary.status = "running";
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test fake-client`
Expected: PASS (2 tests).

- [ ] **Step 5: Full typecheck (now both clients implement the interface)**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/praxis/fake-client.ts apps/web/src/lib/praxis/__tests__/fake-client.test.ts
git commit -m "feat(praxis): fake listTasks/getTask with seeded paging; multi-turn stub"
```

---

## Phase 3 — Server direct-connect data layer

### Task 9: Make the BFF a transparent forwarder

**Files:**
- Modify: `apps/web/src/server/praxis.ts`
- Test: `apps/web/src/server/__tests__/praxis.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../auth", () => ({ getAccessTokenWithRefresh: vi.fn(async () => "tok") }));

describe("forwardToPraxis", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("forwards /api/praxis/v1/tasks/... 1:1 to PRAXIS_BASE_URL", async () => {
    const { forwardToPraxis } = await import("../praxis");
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await forwardToPraxis(new Request("http://app/api/praxis/v1/tasks?limit=2"), ["v1", "tasks"]);
    const calledUrl = (spy.mock.calls[0][0] as string);
    expect(calledUrl).toContain("/v1/tasks?limit=2");
    expect(calledUrl).not.toContain("/v1/v1/");
  });

  it("404s a path whose root is not allowlisted", async () => {
    const { forwardToPraxis } = await import("../praxis");
    const res = await forwardToPraxis(new Request("http://app/api/praxis/v1/projects"), ["v1", "projects"]);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test server/__tests__/praxis`
Expected: FAIL — current code double-prefixes `/v1` and allowlists `segments[0]==="tasks"`.

- [ ] **Step 3: Edit `server/praxis.ts`** — rekey the allowlist and forward transparently:

```ts
/** Only `/v1/tasks/**` is proxied. Keeps this from being an open proxy. */
const ALLOWED = (segments: string[]) => segments[0] === "v1" && segments[1] === "tasks";
```

Replace the guard and URL construction:

```ts
  if (!ALLOWED(segments)) {
    return json({ error: "not_found" }, 404);
  }
  // ...token + auth unchanged...
  const search = new URL(request.url).search;
  const url = `${PRAXIS_BASE_URL}/${segments.join("/")}${search}`;
```

(`isSse` check stays `segments[segments.length - 1] === "events"`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test server/__tests__/praxis`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/praxis.ts apps/web/src/server/__tests__/praxis.test.ts
git commit -m "refactor(bff): transparent /v1/tasks forwarder so contract paths line up"
```

### Task 10: Server-side direct praxis client

**Files:**
- Create: `apps/web/src/server/praxis-client.ts`

- [ ] **Step 1: Implement** (no unit test — thin wiring around the tested factory; covered via Task 11):

```ts
import "server-only";
import type { Client } from "openapi-fetch";
import type { paths } from "@/lib/praxis/generated";
import { createPraxisFetchClient } from "@/lib/praxis/openapi-fetch-client";
import { getAccessTokenWithRefresh } from "./auth";

const PRAXIS_BASE_URL = process.env.PRAXIS_BASE_URL ?? "http://localhost:8091";

/**
 * Server-only praxis client. Talks DIRECTLY to praxis (server-to-server, no
 * CORS) and attaches the iam JWT as a Bearer header. Distinct from the browser
 * transport, which goes through the same-origin BFF. Built from the same
 * generated-paths factory, so calls are contract-bound on both sides.
 */
export function serverPraxisClient(): Client<paths> {
  return createPraxisFetchClient({
    baseUrl: PRAXIS_BASE_URL,
    getToken: getAccessTokenWithRefresh,
  });
}
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @ash/web typecheck
git add apps/web/src/server/praxis-client.ts
git commit -m "feat(server): direct server-to-server praxis client (no BFF, no CORS)"
```

### Task 11: Replace `server/tasks.ts` stubs with real fetches

**Files:**
- Modify: `apps/web/src/server/tasks.ts`
- Test: `apps/web/src/server/__tests__/tasks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../praxis-client", () => ({
  serverPraxisClient: () => ({
    GET: vi.fn(async (path: string) => {
      if (path === "/v1/tasks")
        return { data: { items: [{ id: "t1", title: "T", status: "running", project_id: null }], next_cursor: null }, response: { ok: true } };
      return { data: { id: "t1", title: "T", status: "completed", project_id: null }, response: { ok: true } };
    }),
  }),
}));

describe("server tasks", () => {
  it("listTasks projects summaries to card tasks", async () => {
    const { listTasks } = await import("../tasks");
    const tasks = await listTasks("zh");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("t1");
    expect(tasks[0].status).toBe("running");
  });

  it("getActiveTask returns a card task for a known id", async () => {
    const { getActiveTask } = await import("../tasks");
    const task = await getActiveTask("t1", "zh");
    expect(task?.status).toBe("completed");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test server/__tests__/tasks`
Expected: FAIL — current `listTasks` returns `[]`.

- [ ] **Step 3: Implement** `server/tasks.ts`:

```ts
import "server-only";
import type { AshLocale, Task } from "@ash/shared";
import { serverPraxisClient } from "./praxis-client";
import { summaryToTask } from "@/lib/praxis/summary-projection";

// Server components have no per-event ts; stamp list/get cards with request time.
function labels(_locale: AshLocale) {
  return { ts: new Date().toISOString(), untitled: _locale === "en" ? "Untitled task" : "未命名任务" };
}

export async function listTasks(locale: AshLocale): Promise<Task[]> {
  const client = serverPraxisClient();
  const { data, error } = await client.GET("/v1/tasks", { params: { query: { limit: 50 } } });
  if (error || !data) return [];
  return data.items.map((s) => summaryToTask(s, labels(locale)));
}

export async function getActiveTask(taskId: string, locale: AshLocale): Promise<Task | undefined> {
  const client = serverPraxisClient();
  const { data, error } = await client.GET("/v1/tasks/{id}", { params: { path: { id: taskId } } });
  if (error || !data) return undefined;
  return summaryToTask(data, labels(locale));
}
```

(Note `new Date().toISOString()` is allowed here — RSC runtime, not a workflow script.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test server/__tests__/tasks`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/tasks.ts apps/web/src/server/__tests__/tasks.test.ts
git commit -m "feat(server): real listTasks/getActiveTask via direct praxis client"
```

---

## Phase 4 — UI: list ("view all") + sidebar/home wiring

### Task 12: All-tasks list component (cursor paging + empty/error/loading)

**Files:**
- Create: `apps/web/src/components/workbench/tasks/all-tasks-list.tsx`
- Test: `apps/web/src/components/workbench/tasks/__tests__/all-tasks-list.test.tsx`

- [ ] **Step 1: Write the failing test** (React Testing Library; the repo uses Vitest + RTL — mirror an existing component test for setup):

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AllTasksList } from "../all-tasks-list";

const messages = { Workbench: { allTasksTitle: "全部任务", loadMore: "加载更多", tasksEmpty: "还没有任务", tasksError: "加载失败，点击重试" } };
const wrap = (ui: React.ReactNode) => <NextIntlClientProvider locale="zh" messages={messages}>{ui}</NextIntlClientProvider>;

describe("AllTasksList", () => {
  it("renders fetched tasks and loads the next page", async () => {
    const client = {
      listTasks: vi.fn()
        .mockResolvedValueOnce({ items: [{ id: "a", title: "甲", status: "running", project_id: null }], next_cursor: "c2" })
        .mockResolvedValueOnce({ items: [{ id: "b", title: "乙", status: "completed", project_id: null }], next_cursor: null }),
    };
    render(wrap(<AllTasksList locale="zh" client={client as never} />));
    await waitFor(() => screen.getByText("甲"));
    fireEvent.click(screen.getByText("加载更多"));
    await waitFor(() => screen.getByText("乙"));
    expect(screen.queryByText("加载更多")).toBeNull(); // next_cursor null => button gone
  });

  it("shows the empty state when there are no tasks", async () => {
    const client = { listTasks: vi.fn().mockResolvedValue({ items: [], next_cursor: null }) };
    render(wrap(<AllTasksList locale="zh" client={client as never} />));
    await waitFor(() => screen.getByText("还没有任务"));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test all-tasks-list`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** the client component (status dots reuse `StatusDot` like `task-section.tsx`; keep tokens, no palette literals per ADR-0013):

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AshLocale } from "@ash/shared";
import type { PraxisTaskClient } from "@/lib/praxis/client";
import type { TaskSummary } from "@/lib/praxis/runtime-events";
import { Button } from "@ash/ui";

type LoadState = "idle" | "loading" | "error";

export function AllTasksList({ locale, client }: { locale: AshLocale; client: PraxisTaskClient }) {
  const t = useTranslations("Workbench");
  const [items, setItems] = useState<TaskSummary[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<LoadState>("idle");
  const [started, setStarted] = useState(false);

  const load = useCallback(async (next?: string) => {
    setState("loading");
    try {
      const page = await client.listTasks({ limit: 20, cursor: next });
      setItems((prev) => (next ? [...prev, ...page.items] : page.items));
      setCursor(page.next_cursor ?? null);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [client]);

  useEffect(() => { if (!started) { setStarted(true); void load(); } }, [started, load]);

  if (state === "error" && items.length === 0) {
    return <button className="text-sm text-muted-foreground underline" onClick={() => void load()}>{t("tasksError")}</button>;
  }
  if (state === "idle" && items.length === 0) {
    return <p className="px-3 py-6 text-sm text-muted-foreground">{t("tasksEmpty")}</p>;
  }
  return (
    <div className="flex flex-col gap-1" data-locale={locale}>
      <h1 className="px-3 py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("allTasksTitle")}</h1>
      {items.map((task) => (
        <Link key={task.id} href={`/${locale}/app/task/${task.id}`} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
          {task.title ?? "—"}
        </Link>
      ))}
      {cursor ? (
        <Button variant="ghost" size="sm" disabled={state === "loading"} onClick={() => void load(cursor)}>
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ash/web test all-tasks-list`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the i18n keys** to both catalogs (`apps/web/messages/zh.json` + `en.json`) under `Workbench`: `allTasksTitle`, `loadMore`, `tasksEmpty`, `tasksError`. Run `pnpm i18n:check`. Then commit:

```bash
git add apps/web/src/components/workbench/tasks/ apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(workbench): all-tasks list with cursor paging + empty/error states"
```

### Task 13: `/app/tasks` route + sidebar "view all" link

**Files:**
- Create: `apps/web/src/app/[locale]/(app)/app/tasks/page.tsx`
- Modify: `apps/web/src/components/workbench/sidebar/task-section.tsx`

- [ ] **Step 1: Create the page** (client transport is selected via `getPraxisClient()`; the page is a thin client wrapper so it can pass the live client — keep it a Client Component):

```tsx
"use client";

import { use } from "react";
import type { AshLocale } from "@ash/shared";
import { getPraxisClient } from "@/lib/praxis/client";
import { AllTasksList } from "@/components/workbench/tasks/all-tasks-list";

export default function AllTasksPage({ params }: { params: Promise<{ locale: AshLocale }> }) {
  const { locale } = use(params);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <AllTasksList locale={locale} client={getPraxisClient()} />
    </div>
  );
}
```

- [ ] **Step 2: Add a "view all" link** in `task-section.tsx` after the sliced list (`displayTasks` stays `tasks.slice(0, 10)`). Add below the task items, before the section closes:

```tsx
      <Link href={`/${locale}/app/tasks`} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
        {t("viewAllTasks")}
      </Link>
```

Add `viewAllTasks` to both i18n catalogs.

- [ ] **Step 3: Verify the page renders against the fake client**

Run: `pnpm --filter @ash/web dev` then visit `/zh/app/tasks`.
Expected: seeded fake tasks render; "加载更多" pulls page 2; button disappears at the end.

- [ ] **Step 4: i18n check + commit**

```bash
pnpm --filter @ash/web i18n:check
git add apps/web/src/app/[locale]/\(app\)/app/tasks apps/web/src/components/workbench/sidebar/task-section.tsx apps/web/messages
git commit -m "feat(workbench): /app/tasks view-all page + sidebar link"
```

---

## Phase 5 — Deep-link cold load

### Task 14: Seed the provider from a server-fetched task

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Modify: `apps/web/src/app/[locale]/(app)/app/task/[taskId]/page.tsx` (pass server task as `initialTask`)
- Test: `apps/web/src/components/workbench/__tests__/task-run-provider-seed.test.tsx`

- [ ] **Step 1: Write the failing test** — seeding an initial task makes it visible via `getRun`, and mounting its view triggers `attach` (history catch-up) rather than showing "not found":

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TaskRunProvider, useTaskRun, useSeedTask } from "../task-run-provider";

vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    history: vi.fn(async () => ({ items: [], next_cursor: null })),
    streamEvents: async function* () {},
  }),
}));

it("exposes a server-seeded task via getRun", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
  const { result } = renderHook(() => ({ seed: useSeedTask(), run: useTaskRun("srv-1") }), { wrapper });
  act(() => {
    result.current.seed({ id: "srv-1", title: "服务端任务", description: "", status: "running", createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] });
  });
  // re-read after state update
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test task-run-provider-seed`
Expected: FAIL — `useSeedTask` is not exported.

- [ ] **Step 3: Add a `seedTask` to the provider.** In `task-run-provider.tsx`, extend the context value and implementation:

```ts
  /** Seed a task fetched on the server (deep-link cold load) into session state. */
  seedTask(task: Task): void;
```

Implementation inside `TaskRunProvider` (upsert without clobbering a live run):

```ts
  const seedTask = useCallback((task: Task) => {
    setRuns((prev) => (prev[task.id] ? prev : { ...prev, [task.id]: task }));
    setOrder((prev) => (prev.includes(task.id) ? prev : [task.id, ...prev]));
  }, []);
```

Add to the context `value` and export a hook:

```ts
export function useSeedTask() {
  const ctx = useContext(TaskRunContext);
  if (!ctx) throw new Error("useSeedTask must be used within TaskRunProvider");
  return ctx.seedTask;
}
```

- [ ] **Step 4: Wire the task page** to fetch on the server and seed on the client. In `task/[taskId]/page.tsx`, the server component already calls `getActiveTask`; pass it to a small client seeder that calls `useSeedTask` in an effect, then renders `WorkbenchApp`. Add a `TaskSeeder` client component:

```tsx
"use client";
import { useEffect } from "react";
import type { Task } from "@ash/shared";
import { useSeedTask } from "@/components/workbench/task-run-provider";
export function TaskSeeder({ task }: { task: Task }) {
  const seed = useSeedTask();
  useEffect(() => { seed(task); }, [seed, task]);
  return null;
}
```

Render `<TaskSeeder task={serverTask} />` inside the provider when `getActiveTask` returns a task. `useReattachOnView(taskId)` (already present) then runs history catch-up + re-subscribe.

- [ ] **Step 5: Run test + manual deep-link check**

Run: `pnpm --filter @ash/web test task-run-provider-seed` → PASS.
Manual: with fake client, hard-reload `/zh/app/task/seed-2` → the task hydrates (card from server seed, then history projection), not a blank "unknown task".

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx apps/web/src/app/[locale]/\(app\)/app/task apps/web/src/components/workbench/__tests__/task-run-provider-seed.test.tsx
git commit -m "feat(workbench): deep-link cold load via server seed + history catch-up"
```

---

## Phase 6 — Cancel UI

### Task 15: Add `cancel` to the provider + a chat header button

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx`
- Test: `apps/web/src/components/workbench/__tests__/task-run-cancel.test.tsx`

- [ ] **Step 1: Write the failing test** — calling `cancelTask` invokes the client and flips status to failed locally:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { TaskRunProvider, useCancelTask, useTaskRun, useSeedTask } from "../task-run-provider";

const cancel = vi.fn(async () => {});
vi.mock("@/lib/praxis/client", () => ({ getPraxisClient: () => ({ cancel, history: vi.fn(), streamEvents: async function* () {} }) }));

it("cancels a running task", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
  const { result } = renderHook(() => ({ seed: useSeedTask(), cancelTask: useCancelTask(), run: useTaskRun("c-1") }), { wrapper });
  act(() => result.current.seed({ id: "c-1", title: "x", description: "", status: "running", createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] }));
  await act(async () => { await result.current.cancelTask("c-1"); });
  expect(cancel).toHaveBeenCalledWith("c-1");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test task-run-cancel`
Expected: FAIL — `useCancelTask` not exported.

- [ ] **Step 3: Implement** in the provider. Add to context + value:

```ts
  /** Cancel a non-terminal task (praxis POST /cancel) and abort its stream. */
  cancelTask(taskId: string): Promise<void>;
```

```ts
  const cancelTask = useCallback(async (taskId: string) => {
    await clientRef.current.cancel(taskId);
    // Abort the live stream; reflect terminal state immediately.
    setRuns((prev) => (prev[taskId] ? { ...prev, [taskId]: { ...prev[taskId], status: "failed" } } : prev));
  }, []);
```

Export hook `useCancelTask` (mirror `useAnswerTask`).

- [ ] **Step 4: Add the button** in `workbench-chat.tsx` header, shown only when `active.status === "running" || active.status === "awaiting_input"`:

```tsx
{(active.status === "running" || active.status === "awaiting_input") ? (
  <Button variant="ghost" size="sm" onClick={() => void cancelTask(active.id)}>
    {t("cancelTask")}
  </Button>
) : null}
```

Wire `const cancelTask = useCancelTask();` near the other hooks and add `cancelTask` i18n key to both catalogs.

- [ ] **Step 5: Run test + i18n check**

Run: `pnpm --filter @ash/web test task-run-cancel` → PASS. `pnpm --filter @ash/web i18n:check` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx apps/web/src/components/workbench/chat/workbench-chat.tsx apps/web/src/components/workbench/__tests__/task-run-cancel.test.tsx apps/web/messages
git commit -m "feat(workbench): cancel running task from chat header"
```

---

## Phase 7 — Multi-turn follow-up

### Task 16: `sendFollowUp` in the provider + composer enablement on completed tasks

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx`
- Test: `apps/web/src/components/workbench/__tests__/task-run-followup.test.tsx`

- [ ] **Step 1: Write the failing test** — sending a follow-up posts the message, optimistically appends the user message, and re-subscribes for the reply:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TaskRunProvider, useSendFollowUp, useSeedTask, useTaskRun } from "../task-run-provider";

const sendMessage = vi.fn(async () => {});
vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({ sendMessage, history: vi.fn(), streamEvents: async function* () {} }),
}));

it("posts a follow-up and appends the user message", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <TaskRunProvider>{children}</TaskRunProvider>;
  const { result } = renderHook(() => ({ seed: useSeedTask(), send: useSendFollowUp(), run: useTaskRun("f-1") }), { wrapper });
  act(() => result.current.seed({ id: "f-1", title: "x", description: "", status: "completed", createdAt: "t", updatedAt: "t", messages: [], artifacts: [], toolTraces: [] }));
  await act(async () => { await result.current.send("f-1", "再补一页结尾"); });
  expect(sendMessage).toHaveBeenCalledWith("f-1", "再补一页结尾");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @ash/web test task-run-followup`
Expected: FAIL — `useSendFollowUp` not exported.

- [ ] **Step 3: Implement** in the provider — reuse the existing stream-subscribe helper (the same one `startTask`/`attach` use; reference it as `runStream`):

```ts
  /** Send a free follow-up message into an existing task, then stream the reply. */
  sendFollowUp(taskId: string, text: string): Promise<void>;
```

```ts
  const sendFollowUp = useCallback(async (taskId: string, text: string) => {
    // Optimistic user message + back to running.
    setRuns((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      const msg = { id: `local-${taskId}-${cur.messages.length}`, role: "user" as const, content: text, createdAt: new Date().toISOString() };
      return { ...prev, [taskId]: { ...cur, status: "running", messages: [...cur.messages, msg] } };
    });
    await clientRef.current.sendMessage(taskId, text);
    void runStream(taskId); // re-subscribe for the assistant turn
  }, []);
```

Export `useSendFollowUp` hook.

- [ ] **Step 4: Enable the composer for terminal tasks** in `workbench-chat.tsx`. The composer currently sends only on fresh runs; route its submit to `sendFollowUp(active.id, text)` when `active.status` is `completed`/`failed` (multi-turn), keeping the existing answer path for `awaiting_input`. Confirm the composer is not disabled on completed tasks.

- [ ] **Step 5: Run test + manual check**

Run: `pnpm --filter @ash/web test task-run-followup` → PASS.
Manual (fake): finish a task, type a follow-up, confirm the user bubble appears and a scripted reply streams (fake `sendMessage` sets status running; the re-subscribe replays the scripted stream).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx apps/web/src/components/workbench/chat/workbench-chat.tsx apps/web/src/components/workbench/__tests__/task-run-followup.test.tsx
git commit -m "feat(workbench): multi-turn follow-up messages into a task"
```

---

## Phase 8 — Docs sync + full verification

### Task 17: Update component docs + ROADMAP

**Files:**
- Modify: `docs/components/workbench-chat.md`, `docs/components/workbench-sidebar.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update `workbench-chat.md`** — document the cancel button (states it appears in) and multi-turn follow-up composer behavior + payload (`POST /messages`).
- [ ] **Step 2: Update `workbench-sidebar.md`** — document the "view all" link and that the sidebar shows the first 10 of a server-backed list.
- [ ] **Step 3: Update `ROADMAP.md`** — move "list pagination consumers", "deep-link reconnect", cancel, and multi-turn from deferred to done; note projects still deferred.
- [ ] **Step 4: Commit**

```bash
git add docs/components ROADMAP.md
git commit -m "docs: task lifecycle (list/deep-link/cancel/multi-turn) landed; projects still deferred"
```

### Task 18: Full workspace verification (fake-first), then http smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the whole CI gate locally**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm i18n:check
```
Expected: all PASS (including `gen:praxis:check`).

- [ ] **Step 2: Fake-client manual sweep** — `pnpm --filter @ash/web dev`, then exercise: home list, `/app/tasks` paging, deep-link reload of a task, cancel a running task, multi-turn follow-up.
- [ ] **Step 3: http transport smoke (requires praxis at `:8091`)** — set `NEXT_PUBLIC_PRAXIS_TRANSPORT=http` and `PRAXIS_BASE_URL`, log in (cookie), then verify list + deep-link + cancel + follow-up against real praxis. If praxis is unavailable, record this step as deferred in the PR (do not claim it passed).
- [ ] **Step 4: Final commit / open PR** per `superpowers:finishing-a-development-branch`.

---

## Self-review notes

- **Spec coverage:** list (Tasks 6–8,11–13), deep-link cold load (Tasks 6–7,11,14), cancel (Task 15), multi-turn (Task 16), codegen source (Tasks 1–2), openapi-fetch alignment (Tasks 3,7,10), transparent BFF (Task 9), RSC direct (Tasks 10–11), docs/ADR (Tasks 0,17). projects intentionally excluded.
- **SSE carve-out** is the one documented exception (Task 7 Step 3; ADR-0016).
- **Type consistency:** `PraxisTaskClient` gains `listTasks`/`getTask` (Task 6) implemented identically-named in both clients (Tasks 7–8); provider adds `seedTask`/`cancelTask`/`sendFollowUp` with matching `useSeedTask`/`useCancelTask`/`useSendFollowUp` hooks consumed in Tasks 13–16.
- **Open risk:** the upstream tag must actually publish `GET /v1/tasks`/`getTask` in its OpenAPI (Task 1 Step 4 verifies before any code depends on it). The vendored snapshot already shows these operations, so the risk is low.
