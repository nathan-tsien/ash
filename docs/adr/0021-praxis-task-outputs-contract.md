# ADR-0021: praxis `task_outputs` contract (typed deliverables)

## Status

Proposed — **upstream-gated**. The runtime + OpenAPI change lives in praxis/cogito
(`github.com/nathan-tsien/cogito`), outside this repo; ash specifies the consumer contract and
the ash-side migration. Accepted on the ash side as the intended direction.

## Context

ash deliverables are currently projected from `agent_generated` `Attachment`s (sub-project A) —
opaque files addressed by `uri`. This unblocked in-app preview for file/MIME types (sub-project
B / B1), but:

- Structured deliverables (data tables, charts, slide decks — sub-project B2) need **typed
  payloads** to render; an opaque blob cannot drive a table/chart viewer.
- Attachments ride only on `/history`, not the live stream, forcing a post-run `/history`
  catch-up (A) to surface deliverables.
- "Agent-generated file" under-models "the task produced this report/dataset/deck."

The `runtime-event-reducer` already carries a TODO to replace the (now-removed) synthesized
`.pptx` placeholder with "praxis task_outputs when that contract ships." This ADR records that
contract.

## Decision

Add a first-class **`TaskOutput`** to the praxis contract: a typed deliverable with a `kind`
discriminator (`document | table | chart | slides | file | link`), a per-kind structured
`payload` (or an `Attachment` for `file`), exposed both as a live `task_output` stream event and
via `GET /v1/tasks/{id}/outputs` for cold-load. `Attachment` remains for raw user uploads and as
the blob carrier for file outputs. Full shapes + the ash-side migration are in
`docs/superpowers/specs/2026-06-28-praxis-task-outputs-D-contract.md`.

ash adopts it contract-first: bump the `sync:praxis` pinned tag, regenerate `generated.ts`, add a
`TaskOutput` view-model + `Task.outputs`, fold the stream event / outputs endpoint in the reducer
and projection, render the Deliverables tab + canvas from typed outputs (with attachment
fallback), and implement the B2 structured viewers. The A-era `/history` attachment catch-up is
retired once outputs arrive live.

## Consequences

- **Easier:** real structured deliverables (tables/charts/slides) become possible (unblocks B2);
  deliverables become first-class + live; the synthesized-placeholder era fully ends.
- **Harder:** requires upstream praxis work (not ash-controllable); a contract + codegen bump;
  a migration window where both `task_outputs` and `agent_generated` attachments may coexist.
- **Given up:** nothing — the attachment-derived deliverable path (A) keeps working as the
  fallback until outputs are universal.

## Notes

Decision/record only; no ash application code ships here (the contract isn't live yet). When
praxis ships `task_outputs`, the migration runs as its own spec → plan → build cycle and B2
proceeds.
