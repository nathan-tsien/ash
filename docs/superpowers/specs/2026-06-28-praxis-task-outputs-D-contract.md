# praxis `task_outputs` Contract Proposal (sub-project D)

- Status: **Proposed** — upstream contract change for praxis/cogito (`github.com/nathan-tsien/cogito`)
- Date: 2026-06-28
- Author: ash team (consumer-side proposal)
- Relates: ADR-0021 (this proposal's decision record); sub-project A (deliverables-from-attachments, shipped); sub-project B/B2 (canvas + structured viewers, B2 blocked on this)

## Why this exists

ash's deliverables today are projected from `Attachment`s with `source: agent_generated` (A).
That gives **opaque files** addressed by `uri` — fine for B1 in-app preview (image/pdf/markdown/
code/text), but it cannot drive **structured** previews (data tables, charts, slide decks =
sub-project B2): there is no typed payload to render, only a downloadable blob. Two further gaps:

- **Data timing.** Attachments ride only on `/history` `Message`s, not the live stream, so ash
  needs a post-run `/history` catch-up (shipped in A) just to surface them; outputs are never
  "first-class" on the live channel.
- **Semantics.** "An agent-generated file" is weaker than "the task produced this report / this
  dataset / this deck." Tasks have **outputs**; modeling them as message attachments conflates
  provenance (which message carried the file) with the deliverable itself.

This proposal adds a first-class **`TaskOutput`** to the praxis contract. ash **cannot implement
the praxis runtime** (separate repo); this document is the consumer-side contract ash needs, plus
the ash-side migration that lands once praxis ships it. The synthesized `.pptx` placeholder was
already retired in A; this is its real replacement (the `runtime-event-reducer` TODO).

## Proposed contract (OpenAPI additions)

### Schema: `TaskOutput`
```yaml
TaskOutput:
  type: object
  description: A first-class deliverable produced by a task.
  required: [id, task_id, kind, title, created_at]
  additionalProperties: false
  properties:
    id:        { type: string, description: Opaque output id (stable across re-fetch). }
    task_id:   { type: string }
    kind:      { $ref: "#/components/schemas/TaskOutputKind" }
    title:     { type: string, description: Human-facing deliverable name. }
    created_at:{ type: string, format: date-time }
    # Exactly one of `payload` (structured) or `file` (blob) is present, per kind:
    payload:   { description: Structured content for table/chart/slides/document; shape keyed by `kind` (see below). }
    file:      { $ref: "#/components/schemas/Attachment", description: Present for kind=file (and optionally as a downloadable rendering of a structured output). }

TaskOutputKind:
  type: string
  enum: [document, table, chart, slides, file, link]
```

### Per-kind `payload` shapes (structured kinds)
- `document` — `{ format: "markdown" | "html" | "text", content: string }` (small docs inline; large → `file`).
- `table` — `{ columns: [{ key, label, type?: "string"|"number"|"date" }], rows: object[], truncated?: boolean, total_rows?: integer }`.
- `chart` — `{ chart_type: "line"|"bar"|"pie"|"area", series: [{ name, points: [{ x, y }] }], x_label?, y_label? }`.
- `slides` — `{ slides: [{ title?, body_markdown?, image?: Attachment }] }`.
- `file` / `link` — no `payload`; use `file` (Attachment) or a `uri` on link.

(Exact shapes are a starting point for the praxis team to finalize; ash codegens whatever ships.)

### Exposure (two channels, mirroring messages)
1. **Live stream event** — a new `StreamEvent` variant `task_output` carrying a `TaskOutput`,
   emitted when the agent produces a deliverable. This fixes the data-timing gap (outputs appear
   during the run, not only post-completion).
2. **Cold-load** — `GET /v1/tasks/{id}/outputs` → `{ items: TaskOutput[] }` (and/or an `outputs`
   array on the task detail). Lets a deep-link / terminal cold-load fetch outputs without paging
   the whole message history.

### Relationship to `Attachment`
`Attachment` stays for raw **user uploads** and as the blob carrier for `kind: file` / large
structured outputs (`file` field). `TaskOutput` is the typed **deliverable** surface. praxis MAY
keep emitting `agent_generated` attachments for backward compat; ash prefers `TaskOutput` when
present and falls back to attachment-derived deliverables otherwise (migration below).

### Versioning
A praxis **minor** bump (e.g. 0.5.0). ash follows its contract-first discipline: bump the
`sync:praxis` pinned tag, `pnpm gen:praxis` to regenerate `generated.ts`, then implement the
ash-side migration. No hand-written types.

## ash-side migration (lands when praxis ships)

1. **View-model** — add `TaskOutput` to `@ash/shared` (decoupled from wire types, like
   `AshContentBlock`/`AshAttachment`): `{ id, kind, title, createdAt, payload?, file? }`. Add
   `Task.outputs: TaskOutput[]` (sibling of `deliverables`).
2. **Reducer / projection** — handle the `task_output` stream event → upsert into `task.outputs`
   (by id); project `GET /outputs` on attach / cold-load. This supersedes the attachment-based
   deliverable derivation for agent outputs (keep attachment fallback while praxis is mixed).
3. **Deliverables tab** — render from `task.outputs` when present (typed), else today's
   attachment-derived `deliverables`. The count badge counts outputs.
4. **B2 viewers** — `TableViewer` / `ChartViewer` / `SlidesViewer` (sub-project B2) render from
   `payload`; `DeliverableCanvas`'s viewer switch keys off `TaskOutput.kind` for structured
   outputs and falls back to the B1 MIME registry for `kind: file`.
5. **Retire** the attachment-only path once praxis emits outputs for all relevant tasks; remove
   A's `/history` catch-up workaround if outputs arrive live.

## Risks / open questions (for the praxis team)
- Inline-payload size limits (when does a `table`/`document` become a `file` instead?).
- Whether `task_output` should also appear in `/history` for full replay, or only via `/outputs`.
- Auth/serving of `file` outputs (same `/api/praxis` proxy path as attachments — already works).
- Backward compatibility window with `agent_generated` attachments.

## Status / next step
This is a **proposal to upstream praxis/cogito**; ash cannot land the runtime. Track it as
ADR-0021 (Proposed). When praxis ships `task_outputs`, run a full ash spec→plan→build cycle for
the migration above (and unblock B2).
