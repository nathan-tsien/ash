# Skill Injection at Task Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users discover and select praxis skills when starting a task, send them as `skill_hints`, and show the real skill catalog (read-only) in settings — all contract-first off praxis `openapi-v0.2.0`.

**Architecture:** Sync the vendored contract to 0.2.0 and regenerate types (the single source of truth). Extend the BFF allowlist to `/v1/skills`. Add `listSkills` + a `skillHints` arg to the typed transport client, thread it through the task-run provider, and build a `dropdown-menu`-based skill picker on the home composer plus a read-only settings catalog, both fed by one shared client-side `useSkillCatalog` hook.

**Tech Stack:** Next.js (App Router) + React, TypeScript strict, `openapi-typescript` + `openapi-fetch`, Radix `dropdown-menu`, Vitest + Testing Library, next-intl (zh-CN baseline).

**Spec:** `docs/superpowers/specs/2026-06-15-skill-injection-task-start-design.md`

**Working dir for all commands:** repo root `/home/SENSETIME/qiannengsheng/whoami/project-x/ash`. The web filter is `@ash/web`.

---

## Task 1: Sync contract to 0.2.0 + regenerate types + re-export skill types

**Files:**
- Modify: `apps/web/scripts/sync-praxis-contract.sh:15`
- Regenerate (do not hand-edit): `apps/web/src/lib/praxis/contract/praxis.yaml`, `apps/web/src/lib/praxis/contract/schemas.json`, `apps/web/src/lib/praxis/generated.ts`
- Modify: `apps/web/src/lib/praxis/runtime-events.ts`

- [ ] **Step 1: Bump the pinned tag**

In `apps/web/scripts/sync-praxis-contract.sh`, change the `TAG` default:

```bash
TAG="${PRAXIS_TAG:-openapi-v0.2.0}"
```

- [ ] **Step 2: Re-vendor the contract from upstream (requires `gh` auth)**

Run: `pnpm --filter @ash/web sync:praxis`
Expected: `Wrote contract to .../contract`. This overwrites `praxis.yaml` + `schemas.json` with the 0.2.0 snapshot. Confirm `praxis.yaml` line ~4 now reads `version: 0.2.0` and that `/v1/skills` + `/v1/skills/{id}` paths and a `ResourceDescriptor`/`SkillList`/`SkillDetail` schema exist.

- [ ] **Step 3: Regenerate the typed client**

Run: `pnpm --filter @ash/web gen:praxis`
Expected: `generated.ts` rewritten. Grep to confirm: `grep -n "skill_hints\|SkillList\|ResourceDescriptor\|listSkills" apps/web/src/lib/praxis/generated.ts` returns hits.

- [ ] **Step 4: Verify the snapshot matches the tag and codegen is clean**

Run: `pnpm --filter @ash/web sync:praxis:check && pnpm --filter @ash/web gen:praxis:check`
Expected: `vendored praxis contract matches upstream tag openapi-v0.2.0` and no git diff on `generated.ts`.

- [ ] **Step 5: Re-export the new wire types**

In `apps/web/src/lib/praxis/runtime-events.ts`, after the `TaskList` export, add:

```typescript
/** A registered skill descriptor (praxis 0.2.0 GET /v1/skills item). */
export type SkillSummary = components["schemas"]["ResourceDescriptor"];
/** A page of skill descriptors. */
export type SkillList = components["schemas"]["SkillList"];
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS (no new errors; `skill_hints` is optional so existing `startTask` body still compiles).

- [ ] **Step 7: Commit**

```bash
git add apps/web/scripts/sync-praxis-contract.sh apps/web/src/lib/praxis/contract apps/web/src/lib/praxis/generated.ts apps/web/src/lib/praxis/runtime-events.ts
git commit -m "chore(praxis): sync vendored contract to 0.2.0 (skills + skill_hints)"
```

---

## Task 2: Extend the BFF allowlist to `/v1/skills`

**Files:**
- Modify: `apps/web/src/server/praxis.ts:9`
- Test: `apps/web/src/server/__tests__/praxis.test.ts`

- [ ] **Step 1: Write the failing test**

In `apps/web/src/server/__tests__/praxis.test.ts`, inside the `describe("forwardToPraxis", ...)` block (after the existing allowlist tests), add:

```typescript
it("forwards a /v1/skills GET to praxis (allowlisted)", async () => {
  const fetchFn = fetchMock();
  fetchFn.mockResolvedValue(
    new Response('{"items":[]}', { status: 200, headers: { "content-type": "application/json" } }),
  );
  const req = new Request("http://localhost/api/praxis/v1/skills", { method: "GET" });

  const res = await forwardToPraxis(req, ["v1", "skills"]);

  expect(res.status).toBe(200);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const calledUrl = String(fetchFn.mock.calls[0][0]);
  expect(calledUrl).toContain("/v1/skills");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ash/web test -- praxis.test`
Expected: FAIL — the new test gets 404 (skills not yet allowlisted), `fetch` not called.

- [ ] **Step 3: Extend the allowlist**

In `apps/web/src/server/praxis.ts`, replace the `ALLOWED` definition:

```typescript
/** Only `/v1/tasks/**` and `/v1/skills/**` are proxied. Keeps this from being an open proxy. */
const ALLOWED = (segments: string[]) =>
  segments[0] === "v1" && (segments[1] === "tasks" || segments[1] === "skills");
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- praxis.test`
Expected: PASS, including the still-present "404s a path outside the tasks allowlist" test (`/v1/projects` stays disallowed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/praxis.ts apps/web/src/server/__tests__/praxis.test.ts
git commit -m "feat(praxis): allow /v1/skills through the BFF forwarder"
```

---

## Task 3: Add `listSkills` + `skillHints` to the transport client

**Files:**
- Modify: `apps/web/src/lib/praxis/client.ts`
- Modify: `apps/web/src/lib/praxis/http-client.ts`
- Modify: `apps/web/src/lib/praxis/fake-client.ts`
- Test: `apps/web/src/lib/praxis/__tests__/http-client.test.ts`

- [ ] **Step 1: Write the failing tests**

In `apps/web/src/lib/praxis/__tests__/http-client.test.ts`, add inside `describe("httpPraxisClient", ...)`:

```typescript
it("listSkills GETs /api/praxis/v1/skills and returns the page", async () => {
  const fetchFn = stubFetch();
  fetchFn.mockResolvedValue(
    new Response('{"items":[{"id":"web-search","kind":"skill","display_name":"web-search","description":"Search the web","scope":"global","binding":"hint"}],"next_cursor":null}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );

  const page = await httpPraxisClient.listSkills();

  expect(page.items[0].id).toBe("web-search");
  const url = extractUrl(fetchFn.mock.calls[0][0]);
  expect(url.pathname).toBe("/api/praxis/v1/skills");
});

it("startTask includes skill_hints when provided", async () => {
  const fetchFn = stubFetch();
  fetchFn.mockResolvedValue(
    new Response('{"id":"t1","status":"running"}', { status: 202, headers: { "content-type": "application/json" } }),
  );

  await httpPraxisClient.startTask("t1", "hi", ["web-search", "doc-write"]);

  const body = await extractBody(fetchFn);
  expect(body).toEqual({ user_input: "hi", skill_hints: ["web-search", "doc-write"] });
});

it("startTask omits skill_hints when none are selected", async () => {
  const fetchFn = stubFetch();
  fetchFn.mockResolvedValue(
    new Response('{"id":"t1","status":"running"}', { status: 202, headers: { "content-type": "application/json" } }),
  );

  await httpPraxisClient.startTask("t1", "hi", []);

  const body = await extractBody(fetchFn);
  expect(body).toEqual({ user_input: "hi" });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ash/web test -- http-client.test`
Expected: FAIL — `listSkills` is not a function; `startTask` ignores the 3rd arg.

- [ ] **Step 3: Update the client interface**

In `apps/web/src/lib/praxis/client.ts`:
- Update the import to add `SkillList`:

```typescript
import type { CreateTaskRequest, RuntimeEvent, SkillList, TaskHistoryPage, TaskList, TaskSummary } from "./runtime-events";
```

- Change the `startTask` interface line and add `listSkills`:

```typescript
  /** POST /v1/tasks/{id}/start. `skillHints` are sent as `skill_hints` (hints, not locks). */
  startTask(id: string, userInput: string, skillHints?: string[]): Promise<TaskSummary>;
  /** GET /v1/skills — one page of registered skills usable as hints. */
  listSkills(params?: { limit?: number; cursor?: string }): Promise<SkillList>;
```

- [ ] **Step 4: Implement in the http client**

In `apps/web/src/lib/praxis/http-client.ts`:
- Add `SkillList` to the type import from `./runtime-events`.
- Replace the `startTask` implementation:

```typescript
  async startTask(id: string, userInput: string, skillHints?: string[]): Promise<TaskSummary> {
    const body = skillHints && skillHints.length > 0
      ? { user_input: userInput, skill_hints: skillHints }
      : { user_input: userInput };
    return unwrap(
      await api.POST("/v1/tasks/{id}/start", { params: { path: { id } }, body }),
      "startTask",
    );
  },
```

- Add a `listSkills` method (place it after `getTask`):

```typescript
  async listSkills(params?: { limit?: number; cursor?: string }): Promise<SkillList> {
    return unwrap(
      await api.GET("/v1/skills", { params: { query: { limit: params?.limit, cursor: params?.cursor } } }),
      "listSkills",
    );
  },
```

- [ ] **Step 5: Implement in the fake client (UT-only)**

In `apps/web/src/lib/praxis/fake-client.ts`:
- Add `SkillList` to the type import from `./runtime-events`.
- Change `startTask` to accept (and ignore) the hints arg so it satisfies the interface:

```typescript
  async startTask(id: string, _userInput?: string, _skillHints?: string[]): Promise<TaskSummary> {
    const run = runs.get(id);
    if (run) {
      run.summary.status = "running";
      return run.summary;
    }
    return { id, status: "running" };
  },
```

- Add a `listSkills` method (place it after `getTask`):

```typescript
  async listSkills(): Promise<SkillList> {
    return {
      items: [
        { id: "web-search", kind: "skill", display_name: "web-search", description: "检索公开网页并返回结构化摘要。", scope: "global", binding: "hint" },
        { id: "doc-write", kind: "skill", display_name: "doc-write", description: "生成与修订 Markdown 文档。", scope: "global", binding: "hint" },
      ],
      next_cursor: null,
    };
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @ash/web test -- http-client.test`
Expected: PASS (all three new tests + existing ones).

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/praxis/client.ts apps/web/src/lib/praxis/http-client.ts apps/web/src/lib/praxis/fake-client.ts apps/web/src/lib/praxis/__tests__/http-client.test.ts
git commit -m "feat(praxis): listSkills + skill_hints on startTask in the transport client"
```

---

## Task 4: Thread `skillHints` through the task-run provider

**Files:**
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Test: `apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx` (create if absent)

- [ ] **Step 1: Check for an existing provider test file**

Run: `ls apps/web/src/components/workbench/__tests__/ 2>/dev/null | grep task-run-provider`
If it exists, add the test below to it. If not, create `apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx` with the full content in Step 2.

- [ ] **Step 2: Write the failing test**

Create/extend the test. This renders the provider, mocks `getPraxisClient`, calls `startTask` with hints, and asserts the client received them:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const startTask = vi.fn().mockResolvedValue({ id: "t1", title: "hi", status: "running" });
const createTask = vi.fn().mockResolvedValue({ id: "t1", title: "hi", status: "draft" });
// Stream nothing so the run settles immediately.
async function* emptyStream() {}

vi.mock("@/lib/praxis/client", () => ({
  getPraxisClient: () => ({
    createTask,
    startTask,
    streamEvents: emptyStream,
    complete: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    history: vi.fn(),
    listTasks: vi.fn(),
    getTask: vi.fn(),
    sendMessage: vi.fn(),
    answer: vi.fn(),
    listSkills: vi.fn(),
  }),
}));

import { TaskRunProvider, useStartTask } from "../task-run-provider";

function Harness() {
  const start = useStartTask();
  return <button onClick={() => void start("do it", ["web-search"])}>go</button>;
}

afterEach(() => vi.clearAllMocks());

describe("TaskRunProvider startTask", () => {
  it("forwards skillHints to client.startTask", async () => {
    render(
      <NextIntlClientProvider locale="zh" messages={{ Workbench: {} }}>
        <TaskRunProvider>
          <Harness />
        </TaskRunProvider>
      </NextIntlClientProvider>,
    );
    screen.getByText("go").click();
    await waitFor(() => expect(startTask).toHaveBeenCalledWith("t1", "do it", ["web-search"]));
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @ash/web test -- task-run-provider`
Expected: FAIL — `useStartTask`'s function ignores the second argument (TypeScript may also flag the arity once the signature is the old one).

- [ ] **Step 4: Update the provider**

In `apps/web/src/components/workbench/task-run-provider.tsx`:
- Update the `TaskRunContextValue.startTask` doc/signature:

```typescript
  /** Create + start a task, returning its id. Streaming updates land async. */
  startTask(directive: string, skillHints?: string[]): Promise<string>;
```

- Update the `startTask` callback signature and the inner start call:

```typescript
  const startTask = useCallback(
    async (directive: string, skillHints?: string[]): Promise<string> => {
```

- and inside the async IIFE, change the start call:

```typescript
          await clientRef.current.startTask(summary.id, directive, skillHints);
```

- Update the `useStartTask` hook return type:

```typescript
export function useStartTask(): (directive: string, skillHints?: string[]) => Promise<string> {
  return useTaskRunContext().startTask;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- task-run-provider`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/workbench/task-run-provider.tsx apps/web/src/components/workbench/__tests__/task-run-provider.test.tsx
git commit -m "feat(workbench): thread skillHints through provider.startTask"
```

---

## Task 5: Shared `useSkillCatalog` hook

**Files:**
- Create: `apps/web/src/lib/praxis/use-skill-catalog.ts`
- Test: `apps/web/src/lib/praxis/__tests__/use-skill-catalog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/praxis/__tests__/use-skill-catalog.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listSkills = vi.fn();
vi.mock("../client", () => ({ getPraxisClient: () => ({ listSkills }) }));

import { useSkillCatalog, __resetSkillCatalogCache } from "../use-skill-catalog";

function Probe() {
  const { skills, loading, error } = useSkillCatalog();
  return <div>{loading ? "loading" : error ? "error" : skills.map((s) => s.id).join(",")}</div>;
}

afterEach(() => {
  __resetSkillCatalogCache();
  vi.clearAllMocks();
});

describe("useSkillCatalog", () => {
  it("loads skills from the client once", async () => {
    listSkills.mockResolvedValue({
      items: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      next_cursor: null,
    });

    render(<><Probe /><Probe /></>);

    await waitFor(() => expect(screen.getAllByText("web-search").length).toBe(2));
    // Memoized: both Probes share one in-flight request.
    expect(listSkills).toHaveBeenCalledTimes(1);
  });

  it("exposes error state when the fetch fails", async () => {
    listSkills.mockRejectedValue(new Error("boom"));
    render(<Probe />);
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ash/web test -- use-skill-catalog`
Expected: FAIL — module `../use-skill-catalog` does not exist.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/lib/praxis/use-skill-catalog.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { getPraxisClient } from "./client";
import type { SkillSummary } from "./runtime-events";

/**
 * Session-scoped cache of the skill catalog. The in-flight promise is memoized
 * at module scope so navigating between the home composer and settings does not
 * refetch GET /v1/skills within a session. GET /v1/skills is documented
 * single-page; we fetch one page and do not loop on next_cursor.
 */
let cache: Promise<SkillSummary[]> | null = null;

function loadSkills(): Promise<SkillSummary[]> {
  if (!cache) {
    cache = getPraxisClient()
      .listSkills()
      .then((page) => page.items);
  }
  return cache;
}

/** Test-only: drop the module cache between cases. */
export function __resetSkillCatalogCache(): void {
  cache = null;
}

export interface SkillCatalogState {
  skills: SkillSummary[];
  loading: boolean;
  error: boolean;
}

export function useSkillCatalog(): SkillCatalogState {
  const [state, setState] = useState<SkillCatalogState>({ skills: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    loadSkills()
      .then((skills) => {
        if (active) setState({ skills, loading: false, error: false });
      })
      .catch(() => {
        // Reset the cache so a later mount can retry after a transient failure.
        cache = null;
        if (active) setState({ skills: [], loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- use-skill-catalog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/praxis/use-skill-catalog.ts apps/web/src/lib/praxis/__tests__/use-skill-catalog.test.tsx
git commit -m "feat(praxis): useSkillCatalog hook (session-cached GET /v1/skills)"
```

---

## Task 6: `SkillPicker` component

**Files:**
- Create: `apps/web/src/components/workbench/skill-picker.tsx`
- Test: `apps/web/src/components/workbench/__tests__/skill-picker.test.tsx`
- Reference: `packages/ui/src/components/dropdown-menu.tsx` (Radix), `packages/ui/src/components/badge.tsx`, `packages/ui/src/components/button.tsx`

- [ ] **Step 1: Confirm the dropdown-menu exports a checkbox item**

Run: `grep -n "CheckboxItem\|export" packages/ui/src/components/dropdown-menu.tsx`
Expected: a `DropdownMenuCheckboxItem` export exists. If it does NOT, use `DropdownMenuItem` with a manual check indicator instead (toggle `selected` on `onSelect` with `e.preventDefault()` to keep the menu open). Adjust the component in Step 3 accordingly.

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/workbench/__tests__/skill-picker.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

const useSkillCatalog = vi.fn();
vi.mock("@/lib/praxis/use-skill-catalog", () => ({ useSkillCatalog: () => useSkillCatalog() }));

import { SkillPicker } from "../skill-picker";

const messages = {
  Workbench: {
    skillPickerButton: "技能",
    skillPickerEmpty: "暂无可用技能",
    skillPickerHint: "建议技能（非强制）",
    removeSkillAria: "移除技能",
  },
};

function renderPicker(props: { selected: string[]; onChange: (ids: string[]) => void }) {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <SkillPicker {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe("SkillPicker", () => {
  it("renders nothing when the catalog is empty", () => {
    useSkillCatalog.mockReturnValue({ skills: [], loading: false, error: false });
    const { container } = renderPicker({ selected: [], onChange: vi.fn() });
    expect(container).toBeEmptyDOMElement();
  });

  it("selecting a skill calls onChange with its id", async () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    const onChange = vi.fn();
    renderPicker({ selected: [], onChange });

    await userEvent.click(screen.getByText("技能"));
    await userEvent.click(await screen.findByText("web-search"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["web-search"]));
  });

  it("renders a removable chip for a selected skill", async () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "d", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    const onChange = vi.fn();
    renderPicker({ selected: ["web-search"], onChange });

    await userEvent.click(screen.getByLabelText("移除技能"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 3: Implement the component**

Create `apps/web/src/components/workbench/skill-picker.tsx`. (If Step 1 found no `DropdownMenuCheckboxItem`, swap to `DropdownMenuItem` with `onSelect={(e) => { e.preventDefault(); toggle(s.id); }}`.)

```typescript
"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSkillCatalog } from "@/lib/praxis/use-skill-catalog";

export interface SkillPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Task-start skill selector. Lists the registered skill catalog (praxis 0.2.0
 * GET /v1/skills) in a dropdown checklist; chosen skills become removable chips.
 * The selection is sent as `skill_hints` — hints, not locks: the model may still
 * pick a different skill, so copy frames them as suggested/preferred.
 */
export function SkillPicker({ selected, onChange, disabled }: SkillPickerProps) {
  const t = useTranslations("Workbench");
  const { skills, loading, error } = useSkillCatalog();

  // No catalog (empty or unreachable): hide entirely — task start still works.
  if (loading || error || skills.length === 0) return null;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const byId = (id: string) => skills.find((s) => s.id === id);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
            <Sparkles className="size-3.5" aria-hidden />
            {t("skillPickerButton")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-sm">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("skillPickerHint")}
          </DropdownMenuLabel>
          {skills.map((s) => (
            <DropdownMenuCheckboxItem
              key={s.id}
              checked={selected.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
              onSelect={(e) => e.preventDefault()}
              className="flex-col items-start gap-0.5"
            >
              <span className="text-sm font-medium">{s.display_name}</span>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.map((id) => {
        const skill = byId(id);
        if (!skill) return null;
        return (
          <Badge key={id} variant="muted" className="gap-1">
            {skill.display_name}
            <button
              type="button"
              onClick={() => toggle(id)}
              className="rounded-sm hover:text-foreground"
              aria-label={t("removeSkillAria")}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- skill-picker`
Expected: PASS. If `DropdownMenuCheckboxItem` is unavailable or `onCheckedChange` differs, fall back to the `DropdownMenuItem` variant noted in Step 3 and adjust the test trigger if needed (the visible text `web-search` stays the click target).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/skill-picker.tsx apps/web/src/components/workbench/__tests__/skill-picker.test.tsx
git commit -m "feat(workbench): SkillPicker — dropdown checklist + removable chips"
```

---

## Task 7: Wire the picker into the home composer

**Files:**
- Modify: `apps/web/src/components/workbench/workbench-home.tsx`
- Test: `apps/web/src/components/workbench/__tests__/workbench-home.test.tsx` (extend if present; otherwise add a focused test)

- [ ] **Step 1: Write the failing test**

Locate an existing home test: `ls apps/web/src/components/workbench/__tests__/ | grep workbench-home`. Add this test (creating the file with the same provider/intl wrappers used by sibling tests if absent — mirror `skill-picker.test.tsx`'s `NextIntlClientProvider` setup and mock `./task-run-provider`'s `useStartTask` + `useSkillCatalog`):

```typescript
it("passes selected skill ids to startTask", async () => {
  const start = vi.fn().mockResolvedValue("t1");
  // useStartTask mocked to return `start`; useSkillCatalog mocked with one skill.
  // (Mirror the mocks already used by other workbench-home tests.)
  // ... render <WorkbenchHome locale="zh" tasks={[]} projects={[]} /> ...
  await userEvent.type(screen.getByLabelText(/textarea|输入/i), "做个PPT");
  await userEvent.click(screen.getByText("技能"));
  await userEvent.click(await screen.findByText("web-search"));
  await userEvent.click(screen.getByText(/send|发送/i));
  await waitFor(() => expect(start).toHaveBeenCalledWith("做个PPT", ["web-search"]));
});
```

Note for the implementer: match the exact mock style of the existing `workbench-home` tests (how they mock `useStartTask`/`useRouter`). If no home test file exists, create one modeled on `skill-picker.test.tsx` and mock `@/lib/praxis/use-skill-catalog` + `../task-run-provider` (`useStartTask` returning `start`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ash/web test -- workbench-home`
Expected: FAIL — `start` called with one arg only (no skill ids threaded yet).

- [ ] **Step 3: Wire the picker in**

In `apps/web/src/components/workbench/workbench-home.tsx`:
- Add the import near the other imports:

```typescript
import { SkillPicker } from "./skill-picker";
```

- Add skill state alongside `draft`:

```typescript
  const [skillIds, setSkillIds] = useState<string[]>([]);
```

- Pass the hints in `handleStart` (and clear on success). Update the start call and reset:

```typescript
      const id = await startTask(prompt, skillIds);
      setSkillIds([]);
      router.push(taskHref(id));
```

- Add `skillIds` to the `handleStart` `useCallback` dependency array (so the latest selection is captured): `[pendingPrompt, draft, skillIds, starting, startTask, router]`.

- Render the picker inside the `!pendingPrompt` composer block, directly below the input row `div` (still inside the wrapping `<div className="flex w-full flex-col ...">` — wrap the input row and the picker in a column container if needed):

```tsx
          {!pendingPrompt && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                {/* existing input + send Button unchanged */}
              </div>
              <SkillPicker selected={skillIds} onChange={setSkillIds} disabled={starting} />
            </div>
          )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- workbench-home`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @ash/web typecheck && pnpm --filter @ash/web lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/workbench/workbench-home.tsx apps/web/src/components/workbench/__tests__/workbench-home.test.tsx
git commit -m "feat(workbench): select skills on the home composer, send as skill_hints"
```

---

## Task 8: Settings — real read-only skill catalog

**Files:**
- Modify: `apps/web/src/components/settings/sections/skills-section.tsx`
- Test: `apps/web/src/components/settings/sections/__tests__/skills-section.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/settings/sections/__tests__/skills-section.test.tsx`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const useSkillCatalog = vi.fn();
vi.mock("@/lib/praxis/use-skill-catalog", () => ({ useSkillCatalog: () => useSkillCatalog() }));

import { SkillsSection } from "../skills-section";

const messages = {
  Settings: {
    "skills.heading": "技能",
    "skills.description": "可在任务开始时建议使用的技能。",
    "skills.empty": "暂无可用技能",
    "skills.error": "技能列表加载失败",
    "skills.loading": "加载中…",
  },
};

function renderSection() {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <SkillsSection />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe("SkillsSection", () => {
  it("lists skills from the catalog", () => {
    useSkillCatalog.mockReturnValue({
      skills: [{ id: "web-search", kind: "skill", display_name: "web-search", description: "搜索网页", scope: "global", binding: "hint" }],
      loading: false,
      error: false,
    });
    renderSection();
    expect(screen.getByText("web-search")).toBeInTheDocument();
    expect(screen.getByText("搜索网页")).toBeInTheDocument();
  });

  it("shows an error line when the catalog fails", () => {
    useSkillCatalog.mockReturnValue({ skills: [], loading: false, error: true });
    renderSection();
    expect(screen.getByText("技能列表加载失败")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ash/web test -- skills-section`
Expected: FAIL — current section is the disabled Phase-2 placeholder; no catalog rendered.

- [ ] **Step 3: Replace the section body**

Rewrite `apps/web/src/components/settings/sections/skills-section.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useSkillCatalog } from "@/lib/praxis/use-skill-catalog";
import { SectionHeader } from "../section-header";

export function SkillsSection() {
  const t = useTranslations("Settings");
  const { skills, loading, error } = useSkillCatalog();

  return (
    <div>
      <SectionHeader heading={t("skills.heading")} description={t("skills.description")} />

      {loading && <p className="text-sm text-muted-foreground">{t("skills.loading")}</p>}
      {error && <p className="text-sm text-destructive">{t("skills.error")}</p>}
      {!loading && !error && skills.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("skills.empty")}</p>
      )}

      {!loading && !error && skills.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {skills.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">{s.display_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ash/web test -- skills-section`
Expected: PASS.

- [ ] **Step 5: Verify the AgentSkill mock is no longer referenced by this section, and check for orphans**

Run: `grep -rn "getMockSkills\|AgentSkill\|mockSkills" apps/web/src packages/shared/src | grep -v "packages/shared/src/mocks/skills.ts\|packages/shared/src/types.ts"`
Expected: no remaining references in app code. (Leave the `packages/shared` mock + type in place if anything else still imports them; this slice does not delete shared exports. If the grep shows the section was the only consumer and nothing else imports them, leave them — removing shared exports is out of scope for this slice.)

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @ash/web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/settings/sections/skills-section.tsx apps/web/src/components/settings/sections/__tests__/skills-section.test.tsx
git commit -m "feat(settings): live read-only skill catalog from GET /v1/skills"
```

---

## Task 9: i18n strings (zh-CN baseline + en parity)

**Files:**
- Modify: the message catalogs under `apps/web` (discover exact paths in Step 1)
- Verify: `scripts/check-i18n.mjs`

- [ ] **Step 1: Locate the catalogs and existing keys**

Run: `grep -rln "\"Workbench\"\|\"Settings\"" apps/web/messages apps/web/src 2>/dev/null; ls apps/web/messages 2>/dev/null`
Identify the zh and en message JSON files (e.g. `apps/web/messages/zh.json`, `apps/web/messages/en.json`). Open both.

- [ ] **Step 2: Add the new keys to every locale**

Under the `Workbench` object add (zh values shown; provide the en-locale equivalents in the en file — e.g. "Skills", "No skills available", "Suggested skills (optional)", "Remove skill"):

```json
"skillPickerButton": "技能",
"skillPickerHint": "建议技能（非强制，模型可能仍自行选择）",
"skillPickerEmpty": "暂无可用技能",
"removeSkillAria": "移除技能"
```

Under the `Settings` object add:

```json
"skills.heading": "技能",
"skills.description": "在任务开始时可建议使用的技能（提示，非强制）。",
"skills.empty": "暂无可用技能",
"skills.error": "技能列表加载失败",
"skills.loading": "加载中…"
```

If `Settings` already has a `skills.heading`/`skills.description` (from the old placeholder), update their values rather than duplicating, and remove now-unused keys (`skills.phase2Hint`, and `phase2Badge` only if no other section uses it — grep first).

- [ ] **Step 3: Run the i18n check**

Run: `node scripts/check-i18n.mjs`
Expected: PASS (key parity across locales, no missing/extra keys). Fix any reported drift.

- [ ] **Step 4: Run the full web test + lint suite**

Run: `pnpm --filter @ash/web test && pnpm --filter @ash/web lint && pnpm --filter @ash/web typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/messages apps/web/src
git commit -m "i18n: skill picker + settings catalog strings (zh-CN + en parity)"
```

---

## Task 10: Docs, ADR, ROADMAP

**Files:**
- Modify: `docs/components/workbench-chat.md`
- Modify: `docs/components/settings.md`
- Create: `docs/adr/0017-praxis-0.2.0-skill-discovery-and-hints.md`
- Modify: `docs/adr/README.md` (index)
- Modify: `ROADMAP.md`

- [ ] **Step 1: Document the task-start picker**

In `docs/components/workbench-chat.md`, add a section describing the home-composer skill picker: it lists `GET /v1/skills` (`display_name` + `description`), multi-select, and sends the chosen ids as `StartTaskRequest.skill_hints`. State the payload contract and the hint-not-lock semantics (the model may pick a different skill; unregistered ids ignored). Note it is task-start only (no follow-up skill field in the contract).

- [ ] **Step 2: Document the settings catalog**

In `docs/components/settings.md`, update the Skills section description: it is now a live read-only catalog sourced from `GET /v1/skills` (was a Phase-2 placeholder). No toggles — `binding` is `hint`-only in 0.2.0.

- [ ] **Step 3: Write the ADR**

Create `docs/adr/0017-praxis-0.2.0-skill-discovery-and-hints.md` following the format of `docs/adr/0016-contract-first-codegen-and-transport.md` (Status: Accepted, Context, Decision, Consequences). Record: adopting praxis 0.2.0; `GET /v1/skills` through the BFF allowlist; selecting skills at task start sent as `skill_hints` (hints, not locks); settings catalog; and explicitly that activation feedback (`skill_activation_requested`), per-task hint memory, and the skill detail view (`GET /v1/skills/{id}`) are deferred. Reference the spec `docs/superpowers/specs/2026-06-15-skill-injection-task-start-design.md`.

- [ ] **Step 4: Index the ADR + update the roadmap**

- In `docs/adr/README.md`, add a line for ADR-0017 matching the existing index format.
- In `ROADMAP.md`, add a Phase 2 sub-slice row to the P2 table:

```
| P2.4 | Skill discovery + hints at task start — `GET /v1/skills` (BFF allowlist), skill picker on the home composer sending `skill_hints`, settings read-only catalog (ADR-0017) | — | **Committed** |
```

- [ ] **Step 5: Final full-repo verification**

Run: `pnpm lint && pnpm typecheck && pnpm --filter @ash/web test && node scripts/check-i18n.mjs && pnpm --filter @ash/web sync:praxis:check && pnpm --filter @ash/web gen:praxis:check`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add docs ROADMAP.md
git commit -m "docs(praxis): ADR-0017 + component/roadmap updates for skill injection"
```

---

## Self-review notes

- **Spec coverage:** Task 1 (contract sync + types) ✓; Task 2 (BFF allowlist) ✓; Task 3 (client `listSkills` + `skill_hints`) ✓; Task 4 (provider threading) ✓; Task 5 (`useSkillCatalog`) ✓; Task 6 (picker UX) ✓; Task 7 (home wiring) ✓; Task 8 (settings catalog) ✓; Task 9 (i18n) ✓; Task 10 (docs/ADR/roadmap) ✓. Error handling (graceful degrade) covered in Tasks 5/6/8. Out-of-scope items recorded in the ADR (Task 10).
- **Type consistency:** `startTask(id, userInput, skillHints?)`, `useStartTask(): (directive, skillHints?) => Promise<string>`, `listSkills(params?)`, `SkillSummary`/`SkillList`, `useSkillCatalog(): { skills, loading, error }`, `SkillPicker({ selected, onChange, disabled })` are used identically across all tasks.
- **Contract-first:** all wire shapes come from regenerated `generated.ts`; no hand-written request/response types. SSE is untouched.
