# Workspace Process Timeline + Deliverables (sub-project A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the task workspace's faked artifacts + static cards with a `Process | Deliverables` tabbed view driven by real data (tool/ask/done timeline; `agent_generated` attachments).

**Architecture:** Attachments are projected onto the shared `Message` view-model (like blocks are), so `deliverables` derive from messages in both the live reducer and the `/history` projection (parity-safe, mirroring `toolTraces`). The synthesized `.pptx` is removed. `Task.artifacts` becomes `Task.deliverables`. The task workspace becomes a client tab shell reusing sub-project C's card/`StatusChip`/`StatusDot` vocabulary.

**Tech Stack:** Next.js (App Router), React 19, TypeScript strict, Tailwind v4, vitest + @testing-library/react (apps/web + packages/shared), next-intl, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-28-workspace-process-deliverables-A-design.md`
**ADR:** `docs/adr/0020-workspace-process-and-deliverables.md` (this plan amends it: plan strip deferred).

## Global Constraints

- Contract-first: no praxis contract changes; consume the existing `Attachment` on `Message`. Mock client unit-test-only; `getPraxisClient` always real.
- `packages/shared` stays React/Next-free and must not import `apps/web` or `generated.ts`.
- COLOR-1/2: color literals only in `globals.css`; components use semantic tokens; no `text-[Npx]` (TYPE-2).
- Reuse sub-project C vocabulary: card shell `rounded-lg border border-border bg-card p-3`, `StatusChip` (`@ash/ui/status-chip`, variants `running|success|warning|neutral`), `StatusDot` (`@ash/ui/status-dot`, variants `running|success|error|idle`), icon scale UX-9, lucide default stroke.
- User-facing strings are i18n keys (zh-CN baseline); every new key exists in BOTH `apps/web/messages/en.json` and `apps/web/messages/zh.json` under `Workbench` (the `pnpm i18n:check` gate enforces parity). Removed keys must be removed from both.
- Pure reducer/projection: no `Date.now()`/`Math.random()` inside; timestamps injected.
- Three-pane topology unchanged (ADR-0004/0020).
- Branch base already stacks sub-project C (visual vocabulary) + E (ADR-0020); rebase onto `main` once #42/#43 merge.
- Commit after each task. There is no live IAM/praxis locally, so visual checks are build + typecheck + headless self-check where reachable; data-layer correctness is covered by unit tests.

---

### Task 1: Shared view-models — attachments, deliverables, process events

Add the plain types and the pure deliverable deriver to `packages/shared`. No app wiring yet.

**Files:**
- Modify: `packages/shared/src/types.ts`
- Create: `packages/shared/src/deliverables.ts`
- Create: `packages/shared/src/process-events.ts`
- Test: `packages/shared/src/__tests__/deliverables.test.ts`
- Check the package barrel: `packages/shared/src/index.ts` (export the new modules)

**Interfaces:**
- Produces: `AshAttachment`, `AttachmentKind`, `AttachmentSource`, `Message.attachments?`, `Deliverable`, `deliverablesFromMessages(messages: Message[]): Deliverable[]`, `ProcessEvent`, `ProcessEventKind`, `ProcessEventStatus`.

- [ ] **Step 1: Add the types to `types.ts`**

Add after the `Message`/`textOf` block (so `Message` can reference `AshAttachment`):

```ts
export type AttachmentKind = "file" | "image";
export type AttachmentSource = "user_upload" | "agent_generated";

/** A file/image attached to a message (mirrors praxis Attachment, decoupled from wire types). */
export interface AshAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
  kind: AttachmentKind;
  source: AttachmentSource;
  extractedText?: string;
}

/** An agent-produced task output, projected from an agent_generated AshAttachment. */
export interface Deliverable {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
  kind: AttachmentKind;
}

export type ProcessEventKind = "tool" | "ask" | "done";
export type ProcessEventStatus = "running" | "success" | "error" | "info";

/** A normalized, navigable timeline entry derived from message blocks (no new contract). */
export interface ProcessEvent {
  id: string;
  kind: ProcessEventKind;
  label: string;
  status: ProcessEventStatus;
  at: string;
  /** Originating message id, for jump-to-turn. */
  messageId?: string;
}
```

Add `attachments?: AshAttachment[];` to the `Message` interface (after `clientId?`):

```ts
export interface Message {
  id: string;
  role: MessageRole;
  blocks: AshContentBlock[];
  createdAt: string;
  isStreaming?: boolean;
  stopReason?: string;
  clientId?: string;
  /** Agent/user file attachments on this message envelope (praxis Attachment). */
  attachments?: AshAttachment[];
}
```

- [ ] **Step 2: Write the failing test** — `packages/shared/src/__tests__/deliverables.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { deliverablesFromMessages } from "../deliverables";
import type { Message } from "../types";

const msg = (id: string, attachments: Message["attachments"]): Message => ({
  id, role: "assistant", blocks: [], createdAt: "2026-06-28T00:00:00Z", attachments,
});

describe("deliverablesFromMessages", () => {
  it("keeps only agent_generated attachments", () => {
    const out = deliverablesFromMessages([
      msg("m1", [
        { id: "a1", name: "in.csv", mimeType: "text/csv", sizeBytes: 10, uri: "/v1/tasks/t/attachments/a1", kind: "file", source: "user_upload" },
        { id: "a2", name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
      ]),
    ]);
    expect(out.map((d) => d.id)).toEqual(["a2"]);
    expect(out[0]).toMatchObject({ name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file" });
  });

  it("dedupes by id across messages, preserving first-seen order", () => {
    const a = { id: "a", name: "a.pdf", mimeType: "application/pdf", sizeBytes: 1, uri: "u-a", kind: "file" as const, source: "agent_generated" as const };
    const b = { id: "b", name: "b.png", mimeType: "image/png", sizeBytes: 2, uri: "u-b", kind: "image" as const, source: "agent_generated" as const };
    const out = deliverablesFromMessages([msg("m1", [a, b]), msg("m2", [{ ...a, name: "a-v2.pdf" }])]);
    expect(out.map((d) => d.id)).toEqual(["a", "b"]);
    expect(out[0].name).toBe("a.pdf"); // first-seen wins
  });

  it("returns [] when no attachments", () => {
    expect(deliverablesFromMessages([msg("m1", undefined)])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it — expect FAIL**

Run: `pnpm --filter @ash/shared test -- deliverables`
Expected: FAIL — cannot find `../deliverables`.

- [ ] **Step 4: Implement `packages/shared/src/deliverables.ts`**

```ts
import type { Deliverable, Message } from "./types";

/**
 * Project agent-produced deliverables from a conversation's message attachments.
 * Keeps only `source === "agent_generated"`, dedupes by attachment id (first-seen
 * wins), and preserves order — so the live reducer and /history projection yield
 * identical lists (parity, mirroring tracesFromBlocks).
 */
export function deliverablesFromMessages(messages: Message[]): Deliverable[] {
  const order: string[] = [];
  const byId = new Map<string, Deliverable>();
  for (const m of messages) {
    for (const a of m.attachments ?? []) {
      if (a.source !== "agent_generated") continue;
      if (byId.has(a.id)) continue;
      order.push(a.id);
      byId.set(a.id, {
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uri: a.uri,
        kind: a.kind,
      });
    }
  }
  return order.map((id) => byId.get(id)!);
}
```

- [ ] **Step 5: Implement `packages/shared/src/process-events.ts`**

```ts
import type { Message, ProcessEvent } from "./types";
import { ASK_USER_TOOL_NAME } from "./types"; // see note below

// NOTE: ASK_USER_TOOL lives in apps/web (block-fold). To keep packages/shared
// dependency-free, this deriver does NOT import it; it receives the ask tool name.
// See the signature below.
```

Replace the stub above with this final implementation (no extra import — the ask tool name is passed in):

```ts
import type { Message, ProcessEvent, ProcessEventStatus } from "./types";

/**
 * Normalize a conversation's message blocks into a navigable process timeline:
 * one event per tool call (running/success/error), one per unresolved ask, and a
 * terminal "done" when provided. Pure; mirrors tracesFromBlocks' callId keying so
 * online/history parity holds. `askToolName` is injected to avoid coupling
 * packages/shared to the app's praxis constants.
 */
export function processEvents(
  messages: Message[],
  opts: { askToolName: string; done?: { status: "success" | "error"; at: string; label: string } },
): ProcessEvent[] {
  const order: string[] = [];
  const byId = new Map<string, ProcessEvent>();
  const put = (id: string, ev: ProcessEvent) => {
    if (!byId.has(id)) order.push(id);
    byId.set(id, ev);
  };
  for (const m of messages) {
    for (const b of m.blocks) {
      if (b.kind === "tool_use") {
        const prev = byId.get(b.callId);
        const isAsk = b.toolName === opts.askToolName;
        put(b.callId, {
          id: b.callId,
          kind: isAsk ? "ask" : "tool",
          label: b.toolName,
          status: prev?.status ?? (isAsk ? "info" : "running"),
          at: prev?.at ?? m.createdAt,
          messageId: prev?.messageId ?? m.id,
        });
      } else if (b.kind === "tool_result") {
        const prev = byId.get(b.callId);
        const status: ProcessEventStatus = b.ok ? "success" : "error";
        put(b.callId, {
          id: b.callId,
          kind: prev?.kind ?? "tool",
          label: prev?.label ?? b.callId,
          status,
          at: prev?.at ?? m.createdAt,
          messageId: prev?.messageId ?? m.id,
        });
      }
    }
  }
  const events = order.map((id) => byId.get(id)!);
  if (opts.done) {
    events.push({ id: "__done__", kind: "done", label: opts.done.label, status: opts.done.status, at: opts.done.at });
  }
  return events;
}
```

- [ ] **Step 6: Export the new modules** from `packages/shared/src/index.ts`

Read `packages/shared/src/index.ts`; add (matching its existing export style):
```ts
export * from "./deliverables";
export * from "./process-events";
```
(Types in `types.ts` are presumably already re-exported by the barrel — verify `Deliverable`/`ProcessEvent`/`AshAttachment` are exported; if the barrel uses explicit named exports, add them.)

- [ ] **Step 7: Run tests + typecheck — expect PASS**

Run: `pnpm --filter @ash/shared test -- deliverables && pnpm --filter @ash/shared typecheck`
Expected: 3 passing; no type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/deliverables.ts packages/shared/src/process-events.ts packages/shared/src/__tests__/deliverables.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): attachment/deliverable/process-event view-models + deliverablesFromMessages"
```

---

### Task 2: Data layer — consume attachments, derive deliverables, retire the synthesized deck

Swap `Task.artifacts` → `Task.deliverables`; project praxis attachments onto messages in the reducer and history; derive `deliverables`; delete `synthesizePptArtifact`/`synthesizeArtifact` and the deck labels.

**Files:**
- Modify: `packages/shared/src/types.ts` (Task)
- Create: `apps/web/src/lib/praxis/attachments.ts`
- Modify: `apps/web/src/lib/praxis/runtime-event-reducer.ts`
- Modify: `apps/web/src/lib/praxis/history-projection.ts`
- Modify: `apps/web/src/components/workbench/task-run-provider.tsx`
- Modify: `apps/web/src/server/tasks.ts` (cold-load Task producer — read it; swap artifacts→deliverables)
- Modify: `apps/web/messages/en.json`, `apps/web/messages/zh.json` (remove deck keys)
- Test: `apps/web/src/lib/praxis/__tests__/deliverables-projection.test.ts`
- Existing tests to update: any referencing `task.artifacts`, `synthesize*`, `deckFallbackTitle`, `deckPreview` (e.g. reducer/history/projection-parity tests under `apps/web/src/lib/praxis/__tests__/`).

**Interfaces:**
- Consumes: `deliverablesFromMessages` (Task 1), `AshAttachment` (Task 1).
- Produces: `attachmentsToAsh(atts): AshAttachment[] | undefined`; `Task.deliverables: Deliverable[]` (replaces `artifacts`); reducer/history populate it; `message_start` and history messages carry `attachments`.

- [ ] **Step 1: Swap the Task field** in `packages/shared/src/types.ts`

In `interface Task`, replace `artifacts: Artifact[];` with `deliverables: Deliverable[];`. Leave the `Artifact` type and `Conversation.artifacts`/`Project.artifacts` untouched (project workspace still uses them).

- [ ] **Step 2: Write the failing projection test** — `apps/web/src/lib/praxis/__tests__/deliverables-projection.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { attachmentsToAsh } from "../attachments";

describe("attachmentsToAsh", () => {
  it("maps praxis snake_case attachments to AshAttachment", () => {
    const out = attachmentsToAsh([
      { id: "a2", name: "out.xlsx", mime_type: "application/vnd.ms-excel", size_bytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
    ] as never);
    expect(out).toEqual([
      { id: "a2", name: "out.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 20, uri: "/v1/tasks/t/attachments/a2", kind: "file", source: "agent_generated" },
    ]);
  });

  it("returns undefined for empty/absent", () => {
    expect(attachmentsToAsh(undefined)).toBeUndefined();
    expect(attachmentsToAsh([])).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it — expect FAIL**

Run: `pnpm --filter web test -- deliverables-projection`
Expected: FAIL — cannot find `../attachments`.

- [ ] **Step 4: Implement `apps/web/src/lib/praxis/attachments.ts`**

```ts
import type { AshAttachment } from "@ash/shared";
import type { Attachment } from "./runtime-events";

/**
 * Map praxis `Attachment` wire objects (snake_case) to the ash view-model
 * `AshAttachment`. Returns undefined for empty/absent so a message carries
 * `attachments` only when it actually has some (keeps history/live deep-equal).
 */
export function attachmentsToAsh(atts: Attachment[] | undefined): AshAttachment[] | undefined {
  if (!atts || atts.length === 0) return undefined;
  return atts.map((a) => ({
    id: a.id,
    name: a.name,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    uri: a.uri,
    kind: a.kind,
    source: a.source,
    ...(a.extracted_text ? { extractedText: a.extracted_text } : {}),
  }));
}
```

- [ ] **Step 5: Run it — expect PASS**

Run: `pnpm --filter web test -- deliverables-projection`
Expected: 2 passing.

- [ ] **Step 6: Wire the reducer** (`runtime-event-reducer.ts`)

1. Imports: change `import type { Artifact, AshContentBlock, Message, Task } from "@ash/shared";` to drop `Artifact` and add the deriver:
   ```ts
   import type { AshContentBlock, Message, Task } from "@ash/shared";
   import { deliverablesFromMessages } from "@ash/shared";
   import { attachmentsToAsh } from "./attachments";
   ```
2. `message_start`: add attachments to the projected `msg`:
   ```ts
   const msg: Message = {
     id: pm.id,
     role: pm.role === "user" ? "user" : "assistant",
     blocks: (pm.content ?? []).map(praxisBlockToAsh),
     createdAt: pm.created_at,
     isStreaming: true,
     stopReason: pm.stop_reason,
     ...(attachmentsToAsh(pm.attachments) ? { attachments: attachmentsToAsh(pm.attachments) } : {}),
   };
   ```
3. `withMessages`: also derive deliverables:
   ```ts
   function withMessages(task: Task, messages: Message[], nowMs: number): Task {
     return {
       ...task,
       messages,
       toolTraces: tracesFromBlocks(messages),
       deliverables: deliverablesFromMessages(messages),
       updatedAt: iso(nowMs),
     };
   }
   ```
4. `stream_end` completed branch: drop the synthesized artifact:
   ```ts
   if (event.task_status === "completed") {
     return {
       ...state,
       currentMessageId: null,
       task: { ...task, status: "completed", completedAt: iso(nowMs), updatedAt: iso(nowMs) },
     };
   }
   ```
5. Delete `synthesizePptArtifact`, `upsertArtifact`, the `iso`-using deck code, and remove `deckFallbackTitle`/`deckPreview` from `ReducerLabels`.

- [ ] **Step 7: Wire history projection** (`history-projection.ts`)

1. Imports: drop `Artifact`, add deriver + attachments mapper:
   ```ts
   import type { Message, Task } from "@ash/shared";
   import { deliverablesFromMessages, textOf } from "@ash/shared";
   import { attachmentsToAsh } from "./attachments";
   ```
2. `praxisMessageToView`: add attachments:
   ```ts
   function praxisMessageToView(pm: PraxisMessage): Message {
     return {
       id: pm.id,
       role: pm.role === "user" ? "user" : "assistant",
       blocks: (pm.content ?? []).map(praxisBlockToAsh),
       createdAt: pm.created_at,
       stopReason: pm.stop_reason,
       ...(attachmentsToAsh(pm.attachments) ? { attachments: attachmentsToAsh(pm.attachments) } : {}),
     };
   }
   ```
3. `historyToTask`: replace the artifact synth with deliverables:
   ```ts
   return {
     ...seed,
     messages,
     toolTraces: tracesFromBlocks(messages),
     deliverables: deliverablesFromMessages(messages),
     ...(pending ? { status: "awaiting_input" as const, pendingQuestion: pending } : {}),
   };
   ```
4. Delete `synthesizeArtifact`, `upsertArtifact`, and the `deckFallbackTitle`/`deckPreview` fields from `HistoryLabels` (keep `askFallbackText`).

- [ ] **Step 8: Update the provider** (`task-run-provider.tsx`)

1. `labels` (ReducerLabels): remove `deckFallbackTitle`/`deckPreview` lines.
2. `historyLabels` (HistoryLabels): remove `deckFallbackTitle`/`deckPreview` lines.
3. `startTask` seed: replace `artifacts: [],` with `deliverables: [],`.

- [ ] **Step 9: Update the server cold-load adapter** (`apps/web/src/server/tasks.ts`)

Read the file. Wherever it builds a `Task` (cold-load/deep-link), replace `artifacts: [...]` with `deliverables: [...]`. If it synthesized or passed artifacts, derive deliverables instead: if it already folds history via `historyToTask`, deliverables come for free (just remove any artifact seeding); otherwise seed `deliverables: []`. Remove any deck-label arguments it passed to history/reducer labels.

- [ ] **Step 10: Remove dead i18n keys**

In `apps/web/messages/en.json` and `apps/web/messages/zh.json`, remove `runtimeDeckFallbackTitle` and `runtimeDeckPreview` from the `Workbench` namespace (both files). Keep `runtimeAskFallback`, `runtimeFailureNotice`, `runtimeTruncationNotice`.

- [ ] **Step 11: Update existing tests**

Search and fix tests referencing the removed surface:
Run: `grep -rl "artifacts\|synthesize\|deckFallback\|deckPreview" apps/web/src/lib/praxis/__tests__`
For each: replace `task.artifacts` expectations with `task.deliverables`; delete assertions that a deck artifact is synthesized on completion (now there is none); add an assertion to the projection-parity test that `deliverables` match between live and history for a message carrying an `agent_generated` attachment. Keep tests meaningful (assert real behavior).

- [ ] **Step 12: Full verify**

Run: `pnpm --filter @ash/shared typecheck && pnpm --filter web typecheck && pnpm --filter web test && pnpm i18n:check`
Expected: clean; tests pass; i18n parity holds. (TypeScript will flag every remaining `task.artifacts` use — fix each: the only legitimate consumers are the project workspace via `Conversation`/`Project.artifacts`, which are unchanged.)

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(workbench): real deliverables from attachments; retire synthesized deck"
```

---

### Task 3: Deliverable href helper (BFF proxy routing)

Map an attachment `uri` to a browser-fetchable URL through the existing `/api/praxis` proxy (auth forwarded), so deliverables download/open works.

**Files:**
- Create: `apps/web/src/lib/praxis/deliverable-href.ts`
- Test: `apps/web/src/lib/praxis/__tests__/deliverable-href.test.ts`

**Interfaces:**
- Produces: `deliverableHref(uri: string): string`.

- [ ] **Step 1: Confirm the uri shape**

Read how the proxy allow-list works in `apps/web/src/app/api/praxis/[...segments]/route.ts` and `apps/web/src/server/praxis.ts` (it forwards `/api/praxis/v1/tasks/**` and `/v1/skills/**` with `Authorization: Bearer`). Praxis `Attachment.uri` is a praxis reference; treat a path under `/v1/tasks/...` as proxiable. Document the observed shape in your report. If a real run shows the uri is absolute (`http://praxis.../v1/tasks/...`), strip the origin to the path before prefixing.

- [ ] **Step 2: Write the failing test** — `apps/web/src/lib/praxis/__tests__/deliverable-href.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { deliverableHref } from "../deliverable-href";

describe("deliverableHref", () => {
  it("prefixes a praxis-relative /v1/tasks uri with the BFF proxy base", () => {
    expect(deliverableHref("/v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("handles a uri missing the leading slash", () => {
    expect(deliverableHref("v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("reduces an absolute praxis url to its proxied path", () => {
    expect(deliverableHref("https://praxis.internal/v1/tasks/t1/attachments/a1")).toBe("/api/praxis/v1/tasks/t1/attachments/a1");
  });
  it("passes through an external http(s) link unchanged", () => {
    expect(deliverableHref("https://example.com/report.pdf")).toBe("https://example.com/report.pdf");
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter web test -- deliverable-href`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `apps/web/src/lib/praxis/deliverable-href.ts`**

```ts
/**
 * Resolve a praxis attachment `uri` to a browser URL that flows through the BFF
 * proxy (so the ash access token is attached). praxis references under
 * `/v1/tasks/**` are proxiable via `/api/praxis`; a fully-external link is left
 * as-is (opened directly).
 */
export function deliverableHref(uri: string): string {
  // External link (not a praxis path) → leave unchanged.
  if (/^https?:\/\//u.test(uri)) {
    try {
      const u = new URL(uri);
      if (/^\/v1\/tasks\//u.test(u.pathname)) return `/api/praxis${u.pathname}${u.search}`;
      return uri; // genuinely external
    } catch {
      return uri;
    }
  }
  const path = uri.startsWith("/") ? uri : `/${uri}`;
  return `/api/praxis${path}`;
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter web test -- deliverable-href`
Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/praxis/deliverable-href.ts apps/web/src/lib/praxis/__tests__/deliverable-href.test.ts
git commit -m "feat(workbench): deliverable href via BFF praxis proxy"
```

> If Step 1 finds the attachment path is NOT under `/v1/tasks/**` (so the proxy allow-list rejects it), add a minimal authenticated passthrough: extend the allow-list in `apps/web/src/server/praxis.ts` to permit the attachment path, OR add a dedicated `apps/web/src/app/api/praxis/...` route mirroring `forwardToPraxis`. Report which branch you took and why.

---

### Task 4: Deliverables tab UI

Render `Deliverable[]` with sub-project C's card vocabulary: image thumbnail, or a file row with a download action; empty state.

**Files:**
- Create: `apps/web/src/components/workbench/workspace/deliverable-row.tsx`
- Create: `apps/web/src/components/workbench/workspace/deliverables-tab.tsx`
- Modify: `apps/web/messages/en.json`, `apps/web/messages/zh.json` (new keys)

**Interfaces:**
- Consumes: `Deliverable` (Task 1), `deliverableHref` (Task 3).
- Produces: `DeliverablesTab({ deliverables, locale })`, `DeliverableRow({ deliverable })`.

- [ ] **Step 1: Add i18n keys** (both `en.json` and `zh.json`, `Workbench` namespace)

en: `"deliverablesEmpty": "No deliverables yet"`, `"deliverableDownload": "Download"`, `"deliverableOpen": "Open"`.
zh: `"deliverablesEmpty": "暂无交付物"`, `"deliverableDownload": "下载"`, `"deliverableOpen": "打开"`.

- [ ] **Step 2: Implement `deliverable-row.tsx`**

```tsx
"use client";

import type { Deliverable } from "@ash/shared";
import { Download, FileText, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeliverableRow({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const href = deliverableHref(deliverable.uri);

  if (deliverable.kind === "image") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-border bg-card"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={deliverable.name} className="max-h-48 w-full object-cover" />
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-body-sm font-medium">{deliverable.name}</span>
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{formatSize(deliverable.sizeBytes)}</span>
        </div>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium">{deliverable.name}</p>
        <p className="text-caption tabular-nums text-muted-foreground">{formatSize(deliverable.sizeBytes)}</p>
      </div>
      <a
        href={href}
        download={deliverable.name}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("deliverableDownload")}
      >
        <Download className="size-3.5" aria-hidden />
        {t("deliverableDownload")}
      </a>
    </div>
  );
}

// Keep ImageIcon import used (lint): re-exported for potential header use.
export { ImageIcon };
```

(If the unused `ImageIcon` re-export trips lint, drop the import and the trailing export — keep only `Download, FileText`.)

- [ ] **Step 3: Implement `deliverables-tab.tsx`**

```tsx
"use client";

import type { AshLocale, Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { DeliverableRow } from "./deliverable-row";

export function DeliverablesTab({
  deliverables,
}: {
  locale: AshLocale;
  deliverables: Deliverable[];
}) {
  const t = useTranslations("Workbench");
  if (deliverables.length === 0) {
    return <p className="px-1 py-6 text-center text-body-sm text-muted-foreground">{t("deliverablesEmpty")}</p>;
  }
  return (
    <div className="space-y-2">
      {deliverables.map((d) => (
        <DeliverableRow key={d.id} deliverable={d} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + i18n + build**

Run: `pnpm --filter web typecheck && pnpm i18n:check && pnpm --filter web build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/workbench/workspace/deliverable-row.tsx apps/web/src/components/workbench/workspace/deliverables-tab.tsx apps/web/messages/en.json apps/web/messages/zh.json
git commit -m "feat(workbench): deliverables tab (image preview + file download)"
```

---

### Task 5: Process tab UI

Render `ProcessEvent[]` as a clickable timeline reusing the `StatusDot` rail vocabulary; clicking an event invokes `onSelect(messageId)`.

**Files:**
- Create: `apps/web/src/components/workbench/workspace/process-tab.tsx`
- Modify: `apps/web/messages/en.json`, `apps/web/messages/zh.json` (new keys)

**Interfaces:**
- Consumes: `ProcessEvent` (Task 1), `StatusDot` (`@ash/ui/status-dot`).
- Produces: `ProcessTab({ events, onSelect })` where `onSelect?: (messageId: string) => void`.

- [ ] **Step 1: Add i18n keys** (both files, `Workbench`)

en: `"processEmpty": "No activity yet"`. zh: `"processEmpty": "暂无活动"`.

- [ ] **Step 2: Implement `process-tab.tsx`**

```tsx
"use client";

import type { ProcessEvent, ProcessEventStatus } from "@ash/shared";
import { StatusDot } from "@ash/ui/status-dot";
import { cn } from "@ash/ui/lib/utils";
import { useTranslations } from "next-intl";

// Map ProcessEvent status → StatusDot visual variant.
function dotStatus(s: ProcessEventStatus): "running" | "success" | "error" | "idle" {
  if (s === "running") return "running";
  if (s === "success") return "success";
  if (s === "error") return "error";
  return "idle"; // "info" (ask) reads as neutral
}

export function ProcessTab({
  events,
  onSelect,
}: {
  events: ProcessEvent[];
  onSelect?: (messageId: string) => void;
}) {
  const t = useTranslations("Workbench");
  if (events.length === 0) {
    return <p className="px-1 py-6 text-center text-body-sm text-muted-foreground">{t("processEmpty")}</p>;
  }
  return (
    <ol className="ml-1">
      {events.map((ev, i) => {
        const clickable = Boolean(ev.messageId && onSelect);
        return (
          <li
            key={ev.id}
            className={cn("relative flex gap-3 border-l border-border pl-4", i < events.length - 1 && "pb-3")}
          >
            <StatusDot status={dotStatus(ev.status)} label={ev.status} className="absolute left-0 top-1.5 -ml-[5px]" />
            <button
              type="button"
              disabled={!clickable}
              onClick={() => ev.messageId && onSelect?.(ev.messageId)}
              className={cn(
                "min-w-0 flex-1 text-left",
                clickable && "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !clickable && "cursor-default",
              )}
            >
              <code className="rounded-md bg-muted px-1.5 py-px text-caption font-mono">{ev.label}</code>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Typecheck + i18n + build**

Run: `pnpm --filter web typecheck && pnpm i18n:check && pnpm --filter web build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/workspace/process-tab.tsx apps/web/messages/en.json apps/web/messages/zh.json
git commit -m "feat(workbench): process timeline tab (clickable events)"
```

---

### Task 6: Tabbed task workspace shell

Replace `task-workspace.tsx`'s static cards with a `Process | Deliverables` tab switcher (default Process; Deliverables count badge; no auto-switch). Derive events/deliverables from the task; thread a jump-to-turn callback.

**Files:**
- Modify: `apps/web/src/components/workbench/workspace/task-workspace.tsx`
- Modify: `apps/web/messages/en.json`, `apps/web/messages/zh.json` (tab labels)

**Interfaces:**
- Consumes: `processEvents` (Task 1), `ProcessTab` (Task 5), `DeliverablesTab` (Task 4), `StatusChip` (`@ash/ui/status-chip`), `ASK_USER_TOOL` (`apps/web/src/lib/praxis/block-fold.ts`).
- Produces: `TaskWorkspace({ locale, task, onSelectMessage })` — new optional `onSelectMessage?: (messageId: string) => void` prop.

- [ ] **Step 1: Add i18n keys** (both files, `Workbench`)

en: `"tabProcess": "Process"`, `"tabDeliverables": "Deliverables"`.
zh: `"tabProcess": "过程"`, `"tabDeliverables": "交付物"`.

- [ ] **Step 2: Rewrite `task-workspace.tsx`**

```tsx
"use client";

import type { AshLocale, Task } from "@ash/shared";
import { processEvents } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { StatusChip } from "@ash/ui/status-chip";
import { cn } from "@ash/ui/lib/utils";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ASK_USER_TOOL } from "@/lib/praxis/block-fold";
import { ProcessTab } from "./process-tab";
import { DeliverablesTab } from "./deliverables-tab";

type Tab = "process" | "deliverables";

export interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
  onSelectMessage?: (messageId: string) => void;
}

export function TaskWorkspace({ locale, task, onSelectMessage }: TaskWorkspaceProps) {
  const t = useTranslations("Workbench");
  const [tab, setTab] = useState<Tab>("process");

  const done =
    task.status === "completed"
      ? { status: "success" as const, at: task.completedAt ?? task.updatedAt, label: t("processDone") }
      : task.status === "failed"
        ? { status: "error" as const, at: task.updatedAt, label: t("processDone") }
        : undefined;
  const events = processEvents(task.messages, { askToolName: ASK_USER_TOOL, done });
  const deliverables = task.deliverables;

  return (
    <aside className="flex w-workspace shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-body-sm font-semibold">{t("workspaceTitle")}</span>
      </div>

      {/* Tab switcher */}
      <div role="tablist" className="flex items-center gap-1 border-b border-border px-3 py-2">
        <TabButton active={tab === "process"} onClick={() => setTab("process")}>
          {t("tabProcess")}
        </TabButton>
        <TabButton active={tab === "deliverables"} onClick={() => setTab("deliverables")}>
          <span className="flex items-center gap-1.5">
            {t("tabDeliverables")}
            {deliverables.length > 0 ? <StatusChip variant="success">{deliverables.length}</StatusChip> : null}
          </span>
        </TabButton>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {tab === "process" ? (
            <ProcessTab events={events} onSelect={onSelectMessage} />
          ) : (
            <DeliverablesTab locale={locale} deliverables={deliverables} />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Add the `processDone` i18n key** (both files, `Workbench`)

en: `"processDone": "Completed"`. zh: `"processDone": "已完成"`.

- [ ] **Step 4: Typecheck + i18n + build**

Run: `pnpm --filter web typecheck && pnpm i18n:check && pnpm --filter web build`
Expected: clean. (`task-workspace.tsx` no longer imports `ArtifactsCard`/`ToolsCard` — verify no leftover import.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/workbench/workspace/task-workspace.tsx apps/web/messages/en.json apps/web/messages/zh.json
git commit -m "feat(workbench): tabbed task workspace (Process | Deliverables)"
```

---

### Task 7: App-shell wiring + jump-to-turn

Drop the task `artifacts`/`plan:[]` mapping; pass a chat-scroll callback into the task workspace.

**Files:**
- Modify: `apps/web/src/components/workbench/workbench-app.tsx`

**Interfaces:**
- Consumes: `TaskWorkspace` (Task 6, now with `onSelectMessage`).

- [ ] **Step 1: Add a scroll handler** in `WorkbenchApp` (near the other `useCallback`s)

```tsx
const onSelectMessage = useCallback((messageId: string) => {
  if (typeof document === "undefined") return;
  document
    .querySelector(`[data-message-id="${messageId}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}, []);
```

- [ ] **Step 2: Fix the task→Conversation mapping** (the `liveTask ?` chat branch)

In the `active={{ ... }}` object for the task chat, change `artifacts: liveTask.artifacts,` to `artifacts: [],` (the chat does not render artifacts; the `Conversation` type still requires the field). Leave `plan: []` as-is. (Do NOT reference `liveTask.artifacts` — it no longer exists.)

- [ ] **Step 3: Pass the callback to the task workspace**

Change `<TaskWorkspace locale={locale} task={liveTask} />` to:
```tsx
<TaskWorkspace locale={locale} task={liveTask} onSelectMessage={onSelectMessage} />
```

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: clean (any remaining `liveTask.artifacts` reference is a compile error — there should be none after Step 2).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/workbench/workbench-app.tsx
git commit -m "feat(workbench): wire task workspace deliverables + jump-to-turn"
```

---

### Task 8: Consolidate the legacy `/c/[conversationId]` workspace

The legacy container `workbench-workspace.tsx` (PlanCard + ToolsCard + ArtifactsCard) is a third variant. Route the `/c/[id]` surface through the task workspace vocabulary and remove the legacy file.

**Files:**
- Modify: the `/c/[conversationId]` consumer (find it) — likely `apps/web/src/components/workbench/workbench-shell.tsx` and/or `apps/web/src/app/(workbench)/c/[conversationId]/...`
- Remove: `apps/web/src/components/workbench/workspace/workbench-workspace.tsx`

- [ ] **Step 1: Find the consumers**

Run: `grep -rn "workbench-workspace\|WorkbenchWorkspace\|PlanCard\|workbench-shell" apps/web/src`
Identify what renders `WorkbenchWorkspace` and on which route.

- [ ] **Step 2: Decide the consolidation**

`WorkbenchWorkspace` takes a `Conversation` (`active`) with `plan`/`toolTraces`/`artifacts`. The task workspace takes a `Task` with `messages`/`deliverables`. If the `/c/[id]` route has a real `Task` available (live run), render `TaskWorkspace`. If it only has a `Conversation` (mock/project conversation with no task), render a minimal read-only fallback (the project workspace is separate and unaffected). Prefer: route `/c/[id]` to the same `WorkbenchApp` task path if it represents a task; otherwise keep a thin conversation view WITHOUT the synthesized artifacts.

- [ ] **Step 3: Apply + remove the legacy file**

Update the consumer to stop importing `WorkbenchWorkspace`; delete `workbench-workspace.tsx`. Ensure no remaining import references it.

Run: `grep -rn "workbench-workspace" apps/web/src` → expect no results.

- [ ] **Step 4: Verify the `/c/[id]` route**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: clean; the `/c/[conversationId]` route compiles and renders the consolidated workspace.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(workbench): consolidate legacy /c workspace into the task workspace"
```

> If consolidation proves larger than a mechanical reroute (e.g. `/c/[id]` has no task model at all), STOP and report DONE_WITH_CONCERNS describing what the route actually renders — the controller will decide whether to scope this to a follow-up.

---

### Task 9: Docs — ADR-0020 amendment + component doc

**Files:**
- Modify: `docs/adr/0020-workspace-process-and-deliverables.md`
- Modify: `docs/components/workbench-workspace.md`

- [ ] **Step 1: Amend ADR-0020**

Append an "Amendment (2026-06): plan strip deferred" section: praxis emits no plan/todo/step data, so the pinned plan strip is deferred (building an empty/synthetic plan would violate the no-fake discipline); the task workspace ships `Process | Deliverables` tabs now; the plan returns when a real plan source exists.

- [ ] **Step 2: Update `workbench-workspace.md`**

Document the task workspace as the `Process | Deliverables` tab shell: Process = clickable event timeline from real tool/ask/done events (jump-to-turn); Deliverables = real `agent_generated` attachments (image preview + download via the `/api/praxis` proxy), count badge; the synthesized deck is removed; plan strip deferred; rich preview is sub-project B. Note the legacy `/c` container was consolidated.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: ADR-0020 amendment (plan deferred) + workspace Process/Deliverables doc"
```

---

### Task 10: Final verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm i18n:check`
Expected: all green. (`pnpm test` includes the new deliverable/process/href tests + updated reducer/history/parity suites.)

- [ ] **Step 2: Grep for dead surface**

Run: `grep -rn "synthesize\|deckFallback\|deckPreview\|\.artifacts" apps/web/src/lib apps/web/src/components/workbench | grep -v "project\|Project\|Conversation"`
Expected: no task-flow references to synthesized artifacts remain (project artifacts are fine).

- [ ] **Step 3: Headless self-check (best effort)**

Where the surface is reachable without a live backend, capture before/after; the authenticated workbench needs live IAM+praxis, so otherwise rely on the unit tests + build. Note what was and wasn't visually verifiable in the PR.

- [ ] **Step 4: Open the PR**

Title `feat(workbench): task workspace — Process timeline + real deliverables (sub-project A)`; body summarizing the change, linking the spec + ADR-0020, noting deferred items (plan strip; rich preview = B; typed task_outputs = D) and the stacked-on-#42/#43 base.

---

## Self-Review

**Spec coverage:**
- Deliverables from real attachments (retire synth deck) → Tasks 1, 2. ✓
- `Deliverable`/`ProcessEvent`/`AshAttachment` view-models → Task 1. ✓
- Process timeline (tool/ask/done, jump-to-turn) → Tasks 1, 5, 6, 7. ✓
- Tabbed shell (Process|Deliverables, count badge, default Process, no auto-switch) → Task 6. ✓
- Deliverable rendering by mime (image inline / download) + proxy → Tasks 3, 4. ✓
- Legacy `/c` consolidation → Task 8. ✓
- ADR amendment (plan deferred) + docs → Task 9. ✓
- Testing (projection parity, derivers, no synth artifact) → Tasks 1–3, 2(step 11), 10. ✓

**Placeholder scan:** code provided for every logic/UI step; wiring steps that must read an unseen file (`server/tasks.ts` Task 2 step 9; legacy consumer Task 8) name the exact change and the grep to locate it — not "handle it later".

**Type consistency:** `Deliverable`/`ProcessEvent`/`AshAttachment` fields match across Tasks 1→2→4→5→6; `deliverablesFromMessages`/`processEvents`/`attachmentsToAsh`/`deliverableHref` signatures are stable; `TaskWorkspace` gains `onSelectMessage` (Task 6) consumed in Task 7; `Task.artifacts`→`Task.deliverables` swap (Task 2) is consistently consumed (Tasks 6, 7) and the project path keeps `Conversation/Project.artifacts`.

**Note on `processDone` key:** referenced in Task 6 Step 2 and added in Step 3 — add it before running the build in Step 4 (order within the task is fine).
