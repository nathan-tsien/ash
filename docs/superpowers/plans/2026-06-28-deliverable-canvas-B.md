# Deliverable Canvas (sub-project B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Clicking a deliverable opens an in-app canvas (modal) rendering it by MIME type (image/pdf/markdown/code/text), with graceful no-preview + download fallback.

**Architecture:** A pure viewer-registry picks a viewer kind from mime/name; a `useDeliverableText` hook fetches text-family content through the `/api/praxis` proxy; per-kind viewer components render; a `DeliverableCanvas` Dialog composes them; the Deliverables tab owns selection state.

**Tech Stack:** React 19, Next, TS strict, Tailwind v4, vitest + @testing-library/react, next-intl, `@ash/ui` Dialog, react-markdown + remark-gfm + rehype-highlight (already deps).

**Spec:** `docs/superpowers/specs/2026-06-28-deliverable-canvas-B-design.md`

## Global Constraints
- Reuse existing deps only (no new packages). Reuse `@ash/ui` Dialog and the chat markdown stack + `prose-chat` styles.
- Semantic tokens only (no raw palette / `text-[Npx]`). i18n keys in BOTH `apps/web/messages/en.json` and `zh.json` (`pnpm i18n:check`).
- All deliverable URLs go through `deliverableHref(uri)` (`@/lib/praxis/deliverable-href`) — never raw uri.
- `packages/shared` stays React/Next-free (this sub-project is app-only; `Deliverable` type already exists).
- Read-only canvas; cap fetched text at 512 KB.
- Branch base: main (has sub-project A). Commit per task; verify `pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web build && pnpm i18n:check`.

All viewers/files live in `apps/web/src/components/workbench/workspace/deliverable-viewers/` unless noted.

---

### Task 1: Viewer registry + text-fetch hook

**Files:** Create `deliverable-viewers/pick-viewer.ts`, `deliverable-viewers/use-deliverable-text.ts`; Tests `deliverable-viewers/__tests__/pick-viewer.test.ts`, `__tests__/use-deliverable-text.test.tsx`.

**Interfaces (produces):** `type ViewerKind = "image"|"pdf"|"markdown"|"code"|"text"|"none"`; `pickDeliverableViewer(mimeType: string, name: string): ViewerKind`; `useDeliverableText(uri: string): { text: string | null; loading: boolean; error: string | null }`.

- [ ] **Step 1: Failing test — pick-viewer**

```ts
import { describe, expect, it } from "vitest";
import { pickDeliverableViewer } from "../pick-viewer";

describe("pickDeliverableViewer", () => {
  it("maps by mime", () => {
    expect(pickDeliverableViewer("image/png", "a.png")).toBe("image");
    expect(pickDeliverableViewer("application/pdf", "a.pdf")).toBe("pdf");
    expect(pickDeliverableViewer("text/markdown", "a.md")).toBe("markdown");
    expect(pickDeliverableViewer("application/json", "a.json")).toBe("code");
    expect(pickDeliverableViewer("text/plain", "a.txt")).toBe("text");
    expect(pickDeliverableViewer("application/octet-stream", "a.bin")).toBe("none");
  });
  it("falls back to extension when mime is generic", () => {
    expect(pickDeliverableViewer("application/octet-stream", "notes.md")).toBe("markdown");
    expect(pickDeliverableViewer("application/octet-stream", "main.ts")).toBe("code");
    expect(pickDeliverableViewer("text/csv", "data.csv")).toBe("text");
  });
});
```

- [ ] **Step 2: Run → FAIL**  `pnpm --filter web test -- pick-viewer`  (module missing)

- [ ] **Step 3: Implement `pick-viewer.ts`**

```ts
export type ViewerKind = "image" | "pdf" | "markdown" | "code" | "text" | "none";

const CODE_EXT = new Set(["json", "ts", "tsx", "js", "jsx", "py", "css", "html", "yaml", "yml", "sh", "sql"]);
const MARKDOWN_EXT = new Set(["md", "markdown"]);

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Pick an in-app viewer for a deliverable by MIME, falling back to file extension. */
export function pickDeliverableViewer(mimeType: string, name: string): ViewerKind {
  const mime = mimeType.toLowerCase();
  const e = ext(name);
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || e === "pdf") return "pdf";
  if (mime === "text/markdown" || MARKDOWN_EXT.has(e)) return "markdown";
  if (mime === "application/json" || CODE_EXT.has(e)) return "code";
  if (mime.startsWith("text/")) return "text";
  return "none";
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Failing test — use-deliverable-text** `__tests__/use-deliverable-text.test.tsx`

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeliverableText } from "../use-deliverable-text";

afterEach(() => vi.restoreAllMocks());

describe("useDeliverableText", () => {
  it("fetches text via the proxied href", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("hello", { status: 200 })));
    const { result } = renderHook(() => useDeliverableText("/v1/tasks/t/attachments/a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.text).toBe("hello");
    expect(result.current.error).toBeNull();
    expect((fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("/api/praxis/v1/tasks/t/attachments/a", expect.objectContaining({ signal: expect.anything() }));
  });
  it("surfaces a non-ok response as error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    const { result } = renderHook(() => useDeliverableText("/v1/tasks/t/attachments/a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.text).toBeNull();
  });
});
```

- [ ] **Step 6: Run → FAIL**

- [ ] **Step 7: Implement `use-deliverable-text.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

const MAX_BYTES = 512 * 1024;

/** Fetch a text-family deliverable's content through the BFF proxy (cookie auth). */
export function useDeliverableText(uri: string): { text: string | null; loading: boolean; error: string | null } {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setText(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(deliverableHref(uri), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.text();
        if (body.length > MAX_BYTES) {
          setError("too-large");
        } else {
          setText(body);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message || "error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [uri]);

  return { text, loading, error };
}
```

- [ ] **Step 8: Run → PASS; typecheck**  `pnpm --filter web test -- pick-viewer use-deliverable-text && pnpm --filter web typecheck`

- [ ] **Step 9: Commit** `feat(workbench): deliverable viewer registry + text-fetch hook`

---

### Task 2: Viewer components

**Files:** Create `image-viewer.tsx`, `pdf-viewer.tsx`, `markdown-viewer.tsx`, `code-viewer.tsx`, `text-viewer.tsx`, `no-preview.tsx` in `deliverable-viewers/`. Modify `apps/web/messages/{en,zh}.json`.

**Interfaces (consumes):** `Deliverable` (`@ash/shared`), `deliverableHref`, `useDeliverableText` (Task 1). **(produces):** each component is `({ deliverable }: { deliverable: Deliverable }) => JSX`; `NoPreview` is `({ deliverable }) => JSX`.

- [ ] **Step 1: i18n keys** — add to BOTH catalogs under `Workbench`:
  `"viewerLoading"` ("Loading…"/"加载中…"), `"viewerError"` ("Couldn't load preview"/"无法加载预览"), `"viewerTooLarge"` ("File too large to preview"/"文件过大，无法预览"), `"viewerNoPreview"` ("No in-app preview for this file"/"此文件暂不支持应用内预览"), `"viewerOpenInNewTab"` ("Open in new tab"/"在新标签页打开").

- [ ] **Step 2: Implement the static viewers** (no data fetch)

`image-viewer.tsx`:
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function ImageViewer({ deliverable }: { deliverable: Deliverable }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={deliverableHref(deliverable.uri)} alt={deliverable.name} className="mx-auto max-h-[70vh] w-auto object-contain" />;
}
```

`pdf-viewer.tsx`:
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function PdfViewer({ deliverable }: { deliverable: Deliverable }) {
  return <iframe src={deliverableHref(deliverable.uri)} title={deliverable.name} className="h-[70vh] w-full rounded-md border border-border" />;
}
```

`no-preview.tsx`:
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function NoPreview({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-body-sm text-muted-foreground">{t("viewerNoPreview")}</p>
      <a href={deliverableHref(deliverable.uri)} download={deliverable.name} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-label font-medium hover:bg-accent">
        {t("deliverableDownload")}
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Implement the text-family viewers** (use `useDeliverableText`)

Shared loading/error rendering — implement a small inline helper in each, or duplicate the 3-line guard (keep simple). `text-viewer.tsx`:
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { useDeliverableText } from "./use-deliverable-text";

export function TextViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  return <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 text-caption font-mono whitespace-pre-wrap">{text}</pre>;
}
```

`markdown-viewer.tsx` (reuse chat markdown stack + `prose-chat`):
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useDeliverableText } from "./use-deliverable-text";

export function MarkdownViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-body-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{text ?? ""}</ReactMarkdown>
    </div>
  );
}
```

`code-viewer.tsx` (render fenced via the same markdown pipeline so highlight.js applies; language from extension):
```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useDeliverableText } from "./use-deliverable-text";

function lang(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function CodeViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  const fence = "```" + lang(deliverable.name) + "\n" + (text ?? "") + "\n```";
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-caption">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{fence}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: Verify** `pnpm --filter web typecheck && pnpm i18n:check && pnpm --filter web build` clean.

- [ ] **Step 5: Commit** `feat(workbench): deliverable viewer components (image/pdf/markdown/code/text)`

---

### Task 3: Canvas dialog + wiring

**Files:** Create `deliverable-canvas.tsx` (+ `__tests__/deliverable-canvas.test.tsx`); Modify `deliverable-row.tsx`, `deliverables-tab.tsx`, `apps/web/messages/{en,zh}.json`.

**Interfaces (consumes):** `pickDeliverableViewer` (T1), all viewers (T2), `@ash/ui` Dialog. **(produces):** `DeliverableCanvas({ deliverable, onClose })` where `deliverable: Deliverable | null`.

- [ ] **Step 1: Inspect the Dialog API** — read `packages/ui/src/components/dialog.tsx` to use the correct exports (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, etc.). Use the controlled `open`/`onOpenChange` pattern already used by the settings modal (grep `DialogContent` usage in `apps/web/src` for a reference).

- [ ] **Step 2: Implement `deliverable-canvas.tsx`**

```tsx
"use client";
import type { Deliverable } from "@ash/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ash/ui/dialog";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";
import { pickDeliverableViewer } from "./deliverable-viewers/pick-viewer";
import { ImageViewer } from "./deliverable-viewers/image-viewer";
import { PdfViewer } from "./deliverable-viewers/pdf-viewer";
import { MarkdownViewer } from "./deliverable-viewers/markdown-viewer";
import { CodeViewer } from "./deliverable-viewers/code-viewer";
import { TextViewer } from "./deliverable-viewers/text-viewer";
import { NoPreview } from "./deliverable-viewers/no-preview";

function ViewerBody({ deliverable }: { deliverable: Deliverable }) {
  switch (pickDeliverableViewer(deliverable.mimeType, deliverable.name)) {
    case "image": return <ImageViewer deliverable={deliverable} />;
    case "pdf": return <PdfViewer deliverable={deliverable} />;
    case "markdown": return <MarkdownViewer deliverable={deliverable} />;
    case "code": return <CodeViewer deliverable={deliverable} />;
    case "text": return <TextViewer deliverable={deliverable} />;
    default: return <NoPreview deliverable={deliverable} />;
  }
}

export function DeliverableCanvas({ deliverable, onClose }: { deliverable: Deliverable | null; onClose: () => void }) {
  const t = useTranslations("Workbench");
  return (
    <Dialog open={deliverable !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        {deliverable ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{deliverable.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <ViewerBody deliverable={deliverable} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <a href={deliverableHref(deliverable.uri)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-label font-medium hover:bg-accent">
                {t("viewerOpenInNewTab")}
              </a>
              <a href={deliverableHref(deliverable.uri)} download={deliverable.name} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-label font-medium text-primary-foreground">
                {t("deliverableDownload")}
              </a>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```
(Adjust `Dialog*` imports/props to match the actual `@ash/ui/dialog` API found in Step 1.)

- [ ] **Step 3: Wire `deliverable-row.tsx`** — add `onOpen?: (d: Deliverable) => void`. Make the row's primary surface a `<button onClick={() => onOpen?.(deliverable)}>` (both image and file kinds) opening the canvas; KEEP the explicit download `<a>` (stopPropagation so download doesn't also open the canvas). Remove the whole-row `<a target=_blank>` for the image (now the row opens the canvas; the canvas offers open-in-new-tab + download).

- [ ] **Step 4: Wire `deliverables-tab.tsx`** — `const [selected, setSelected] = useState<Deliverable | null>(null)`; pass `onOpen={setSelected}` to each `DeliverableRow`; render `<DeliverableCanvas deliverable={selected} onClose={() => setSelected(null)} />` after the list.

- [ ] **Step 5: Component test** `__tests__/deliverable-canvas.test.tsx` — render `DeliverableCanvas` with a markdown deliverable (mock `fetch` returning `# Hi`) inside the test i18n provider; assert the dialog shows the name and the rendered markdown; render with `deliverable={null}` and assert nothing shown. (Follow an existing component test that wraps with `NextIntlClientProvider` — grep `NextIntlClientProvider` in `apps/web/src` for the harness pattern; if none, wrap inline with the `en` messages.)

- [ ] **Step 6: Verify** `pnpm --filter web typecheck && pnpm --filter web test && pnpm i18n:check && pnpm --filter web build` all green.

- [ ] **Step 7: Commit** `feat(workbench): deliverable canvas dialog + open-on-click wiring`

---

### Task 4: Docs, B2 stub, final verification + PR

**Files:** Modify `docs/components/workbench-workspace.md`; Create `docs/superpowers/specs/2026-06-28-deliverable-canvas-B2-stub.md`.

- [ ] **Step 1: Doc** — add a "Deliverable canvas" section to `workbench-workspace.md`: clicking a deliverable opens an in-app `Dialog` rendering by MIME (image/pdf/markdown/code/text) via the viewer registry, with download + open-in-new-tab; text-family content fetched through `/api/praxis` (cookie auth), capped at 512 KB; unsupported types show no-preview + download. Note structured previews (tables/charts/slides) are B2, gated on sub-project D.

- [ ] **Step 2: B2 stub** — write `2026-06-28-deliverable-canvas-B2-stub.md`: structured viewers (data table, chart, slide deck) rendered from typed `task_outputs`; **blocked on sub-project D** (praxis must emit typed outputs); will likely add a lightweight chart dependency (decide then); registry extends `pickDeliverableViewer`/`ViewerBody` with structured kinds keyed off the output type, not the file mime.

- [ ] **Step 3: Full verify** `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm i18n:check` — all green.

- [ ] **Step 4: Commit + PR** — commit `docs: deliverable canvas + B2 stub`; open PR `feat(workbench): in-app deliverable canvas (sub-project B / B1)` summarizing viewers, the data path, and the B2 deferral.

## Self-Review
- Spec coverage: registry+hook → T1; viewers → T2; canvas+wiring+test → T3; docs+B2+verify → T4. ✓
- No placeholders: code shown for every code step; the two "read existing API/harness" steps (Dialog API in T3.S1, intl test harness in T3.S5) name the exact grep to ground them — real, not hand-waving.
- Type consistency: `ViewerKind`, `pickDeliverableViewer`, `useDeliverableText`, viewer `{deliverable}` props, `DeliverableCanvas({deliverable,onClose})`, `DeliverableRow` `onOpen` — consistent across tasks.
