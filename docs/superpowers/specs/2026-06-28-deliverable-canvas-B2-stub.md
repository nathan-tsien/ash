# Deliverable Canvas — Structured Viewers (B2) — Spec Stub

- Status: Stub — **blocked on sub-project D** (praxis typed `task_outputs`)
- Date: 2026-06-28
- Builds on: sub-project B (B1, in-app canvas for file/MIME deliverables) — this PR
- Blocked by: sub-project D (`docs/superpowers/specs/2026-06-28-praxis-task-outputs-D-*`)

## Purpose

B1 renders deliverables that are **opaque files** addressed by `Attachment.uri` (image, PDF,
markdown, code, text) in an in-app canvas. B2 adds **structured** viewers — data tables, charts,
slide decks — that render from **typed** output payloads, not file blobs.

## Why it's blocked on D

Structured rendering needs the data as structured values (rows/columns, series, slides), not a
downloaded file. praxis ships no typed outputs today; the synthesized deck was retired in A.
Sub-project D defines a `task_output` contract carrying typed payloads. B2 consumes that — it
cannot be built honestly before D lands (rendering, e.g., a CSV as a table is a partial
stand-in, deliberately left as `text` in B1).

## Sketch (to refine once D is concrete)

- Extend the viewer registry: a deliverable/output gains a `kind` discriminator from the typed
  contract (`table | chart | slides | file`). `pickDeliverableViewer` (B1) keys off MIME for
  files; B2 adds a higher-priority branch keying off the typed output `kind`.
- New viewers (in `deliverable-viewers/`):
  - `TableViewer` — paginated/virtualized data table from `{ columns, rows }`. Likely needs a
    lightweight table approach (evaluate `@tanstack/table` vs. a hand-rolled minimal grid — a
    new dependency decision to make in B2, not assumed here).
  - `ChartViewer` — line/bar/pie from a typed series. Needs a charting dep (evaluate a small
    one, e.g. a lightweight SVG charting lib) — decide in B2; keep bundle discipline.
  - `SlidesViewer` — deck preview (slide list + per-slide render) from a typed slides payload.
- The canvas (`DeliverableCanvas`) switch gains the structured kinds; everything else (Dialog,
  download, open-in-new-tab, header) is reused from B1.
- Data path: typed outputs arrive via the D contract (likely on `/history` and/or a dedicated
  outputs endpoint) → a `task.outputs` view-model (sibling to `deliverables`) → the canvas.

## Acceptance (when unblocked)

- A task that produces a typed table/chart/slide output renders it in-app via the canvas.
- New charting/table dependency (if any) is justified, lightweight, and lazy-loaded so it does
  not bloat the default workbench bundle.
- Token + i18n + a11y discipline as in B1.

## Next step

Land sub-project D, then run a full brainstorm → plan → build cycle for B2 using this stub.
