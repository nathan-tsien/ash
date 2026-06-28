# Deliverable Canvas (sub-project B) — Design Spec

- Status: Approved (autonomous build per session goal)
- Date: 2026-06-28
- Builds on: sub-project A (Process + Deliverables) — merged to main (PR #44)
- Relates: ADR-0020 (workspace IA); sub-project D (typed `task_outputs`) for the B2 extension

## Context

Sub-project A gives the Deliverables tab real `agent_generated` attachments rendered as rows
(image thumbnail or file row with download). Clicking opens a new browser tab. Sub-project B
adds an **in-app canvas**: clicking a deliverable opens a viewer overlay that renders it inside
the workbench by MIME type, so users read reports / view outputs without leaving the app.

What's reachable now (B1) is anything fetchable from `Attachment.uri` via the existing
`/api/praxis` proxy: images, PDFs, and text-family files (markdown, code, JSON, plain text).
Structured previews (data tables, charts, slides) need a typed outputs contract praxis doesn't
ship yet — that's **B2**, gated on sub-project D.

## Goals (B1)

1. Clicking a deliverable opens an in-app **canvas** (modal dialog) rendering it by MIME type.
2. Cover the reachable types: image, PDF, markdown, code, JSON, plain text; graceful
   "no preview" + download for anything else.
3. No new heavy dependencies (reuse the `@ash/ui` Dialog and the chat's react-markdown +
   rehype-highlight stack). Token + i18n discipline as in A/C.

## Non-goals (deferred)

- **B2** structured viewers (tables/charts/slides) from typed `task_outputs` — needs sub-project D.
- Editing deliverables (read-only canvas).
- Virtualized/streamed rendering of very large files (cap fetched text size; offer download).

## Architecture

### Viewer registry — `pickDeliverableViewer(mimeType, name): ViewerKind`
Pure mapping, `apps/web/src/components/workbench/workspace/deliverable-viewers/pick-viewer.ts`.
`ViewerKind = "image" | "pdf" | "markdown" | "code" | "text" | "none"`.
- `image/*` → `image`
- `application/pdf` → `pdf`
- `text/markdown`, or name ending `.md`/`.markdown` → `markdown`
- `application/json`, or code-ish extensions (`.json/.ts/.tsx/.js/.jsx/.py/.css/.html/.yaml/.yml/.sh/.sql`) → `code`
- other `text/*` (e.g. `text/plain`, `text/csv`) → `text`
- everything else → `none`
Unit-tested.

### Text fetch hook — `useDeliverableText(uri): { text, loading, error }`
`apps/web/src/components/workbench/workspace/deliverable-viewers/use-deliverable-text.ts`.
Client hook: `fetch(deliverableHref(uri))` (same-origin proxied, cookie auth), read `.text()`,
cap at a max size (e.g. 512 KB — larger → error state suggesting download). Aborts on unmount /
uri change. Only invoked by text-family viewers (markdown/code/text), never for image/pdf.

### Viewer components — `deliverable-viewers/`
One small component per kind, each receiving `{ deliverable }`:
- `ImageViewer` — `<img src={deliverableHref(uri)}>` contained, max-h.
- `PdfViewer` — `<iframe src={deliverableHref(uri)}>` filling the canvas body.
- `MarkdownViewer` — `useDeliverableText` → react-markdown (remark-gfm + rehype-highlight),
  reusing the `prose-chat` styles; loading/error states.
- `CodeViewer` — `useDeliverableText` → `<pre><code>` with rehype-highlight (or the same
  markdown pipeline wrapping the text in a fenced block keyed off the file extension).
- `TextViewer` — `useDeliverableText` → `<pre>` plain.
- `NoPreview` — message + download/open-in-new-tab.

### Canvas — `DeliverableCanvas`
`apps/web/src/components/workbench/workspace/deliverable-canvas.tsx`. A `@ash/ui` `Dialog`
(controlled) with: header (name + size), a download action + open-in-new-tab, and a body that
switches on `pickDeliverableViewer(...)` to the matching viewer. Closes on overlay/esc.

### Wiring
- `DeliverablesTab` owns `const [selected, setSelected] = useState<Deliverable | null>(null)`
  and renders `<DeliverableCanvas deliverable={selected} onClose={() => setSelected(null)} />`.
- `DeliverableRow` gains an `onOpen?: (d) => void`; its primary click calls `onOpen(deliverable)`
  (opens the canvas) instead of opening a new tab. The explicit **download** action remains on
  the row and in the canvas. (Images: the whole row opens the canvas; download stays available.)

## Testing
- `pickDeliverableViewer`: unit table (image/pdf/markdown/code/text/none by mime + by extension).
- `useDeliverableText`: unit with a mocked `fetch` (success text, size-cap error, fetch error,
  abort on unmount).
- `DeliverableCanvas`: component test (renders the right viewer kind for a given mime; shows
  download; closes). next-intl + jsdom via the existing test setup.
- Keep all existing suites green; token + i18n parity gates pass.

## Files
- Create: `deliverable-viewers/pick-viewer.ts` (+ test), `use-deliverable-text.ts` (+ test),
  `image-viewer.tsx`, `pdf-viewer.tsx`, `markdown-viewer.tsx`, `code-viewer.tsx`,
  `text-viewer.tsx`, `no-preview.tsx`, `deliverable-canvas.tsx` (+ test).
- Modify: `deliverable-row.tsx` (onOpen), `deliverables-tab.tsx` (selected state + canvas),
  `apps/web/messages/{en,zh}.json` (canvas i18n).
- Docs: `docs/components/workbench-workspace.md` (canvas section); a B2 stub spec.

## B2 (deferred, gated on sub-project D)
When praxis ships typed `task_outputs` (D), add structured viewers: data table (paginated),
chart (a lightweight chart lib — new dep, decide in B2), slide deck preview. These render from
typed payloads, not opaque files. Spec stub: `docs/superpowers/specs/2026-06-28-deliverable-canvas-B2-stub.md`.
