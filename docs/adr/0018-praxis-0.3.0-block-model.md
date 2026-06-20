# ADR-0018: praxis 0.3.0 block-oriented stream and history model

## Status

Accepted (2026-06-20)

Supersedes the event-shape decisions of ADR-0015 (praxis 0.1.5 interactive execution) and the
`RuntimeEvent`/`HistoryEvent` projection assumptions baked into ADR-0011/0012. Keeps ADR-0016
(contract-first codegen + transport) fully in force — this migration is an application of it.

## Context

praxis published contract **0.3.0** (tag `openapi-v0.3.0`, 2026-06-20), classified **breaking
(schema replacement)** in the upstream CHANGELOG. It replaces the flat event/history model ash
consumes today with a **block-oriented model following the Anthropic message-turn lifecycle**:

- `GET /v1/tasks/{id}/events`: `StreamEvent` **replaces** `RuntimeEvent`. The stream is now
  `message_start` -> (`content_block_start` / `content_block_delta` / `content_block_stop`)* ->
  `message_delta` -> `message_stop`, interleaved with praxis control events (`turn_paused`,
  `turn_resumed`, `skill_activation_requested`, `stream_end`, `ping`). The old flat variants
  (`text_delta`, `thinking_delta`, `turn_started/completed/failed`, `tool_dispatch_*`,
  `notify_user`, `ask_user`) are **removed**.
- `GET /v1/tasks/{id}/history`: returns **`MessagePage`** (replaces `TaskHistoryPage`); `items` is
  **`Message[]`** (not `HistoryItem[]`); the cursor is **`next_before_seq` (int64)**, not the opaque
  string `next_cursor`. A `Message` carries typed `ContentBlock[]`, `stop_reason`, `usage`, `model`,
  `attachments`, `error`.
- ask_user is no longer an event variant: a pending question is a `tool_use` ContentBlock with
  `tool_name == "message_ask_user"`, and `AnswerRequest.ask_id` is that block's `call_id`.
- Removed schemas: `RuntimeEvent`, `HistoryEvent`, `HistoryItem`, `TaskHistoryPage`. New schemas:
  `StreamEvent`, `Message`, `MessagePage`, `ContentBlock`, `BlockDelta`, `MessageRole`,
  `StopReason`, `Usage`, `Attachment`, `Citation`, `Source`, `Display`, `MessageError`, image/source
  enums.

Two facts shape the response:

1. Both unions are defined **in the OpenAPI document**, so `openapi-typescript` generates them —
   no hand-mirror. `runtime-events.ts` already re-exports from `generated.ts`; only the alias set
   changes (ADR-0016 still holds; SSE remains the one hand-written transport because openapi-fetch
   cannot read `text/event-stream`, but it consumes the generated `StreamEvent` union).
2. The change lands on exactly the projection layer PR #37 (workbench UX polish) rewrote on the
   0.2.0 model. PR #37 merges first; this migration then rewrites the projection internals once on
   the post-#37 main. The presentation layer (tokens, sidebar, tool-trace timeline UI, badge) is
   orthogonal to the wire model and survives.

## Decision

1. **Adopt contract 0.3.0.** Bump the sync default tag to `openapi-v0.3.0`, re-sync the vendored
   snapshot, regenerate `generated.ts`. `sync:praxis:check` / `gen:praxis:check` keep CI honest.

2. **Adopt the block model natively in the ash view-model** (not a flatten-to-legacy shim). The
   shared `Message` becomes block-shaped: it carries `ContentBlock[]`. This is the long-term-correct
   choice — it unlocks first-class rendering of thinking, tool calls/results, images, and citations
   that the flat model could not represent, and keeps ash's view-model isomorphic to the contract so
   future block variants are additive.

3. **Stream reducer folds the turn lifecycle.** `runtime-event-reducer.ts` builds the in-flight
   `Message` from `message_start` (open shell), accumulates `content_block_start/delta/stop` into the
   indexed block (text_delta -> append text; thinking_delta -> append thinking; input_json_delta ->
   accumulate a `partial_json` string parsed to `args` on block stop), applies `message_delta`
   (stop_reason + usage) and finalizes on `message_stop`. Control events map to task status
   (`turn_paused` -> awaiting_input, `stream_end{task_status}` -> terminal, `ping` -> ignored,
   `skill_activation_requested` -> surfaced/logged).

4. **History projection becomes a near-identity map.** `history-projection.ts` folds `Message[]`
   directly into the view-model (newest-first page reversed, older pages prepended) and paginates on
   `next_before_seq`. The bespoke per-event folding is gone.

5. **ask_user via tool_use block.** A `tool_use` ContentBlock with `tool_name ==
   "message_ask_user"` and no matching `tool_result` is the pending question; its `call_id` is the
   `ask_id` submitted to `POST /answers`. Re-emitted on subscribe; dedup by `call_id`.

6. **Tool traces derive from blocks.** The workspace tool trace is projected from `tool_use` /
   `tool_result` block pairs (correlated by `call_id`), preserving the PR #37 timeline UI and
   upsert-by-call_id dedupe.

## Consequences

- The whole stream/history/answer path is rebuilt against generated 0.3.0 types; no hand-written
  shapes. ash gains thinking/tool/image/citation rendering capability it did not have.
- `@ash/shared` `Message` is a breaking internal change; every consumer of `message.content:string`
  migrates to `ContentBlock[]` (chat bubble, tool trace, summary/preview helpers).
- The optimistic-user-message reconcile (PR #37) is re-expressed against the block model: the
  optimistic bubble is a `Message` with a single text block + `clientId`, reconciled by trimmed text.
- The fake praxis client and the reducer/history/sse tests are rewritten to emit the new events;
  TDD drives the new folds.
- Risk is concentrated in the reducer accumulation logic (partial_json assembly, multi-block
  ordering). It is the core agent loop and gets human review; the plan covers it test-first.

## Related

- `docs/superpowers/plans/2026-06-20-praxis-0.3.0-block-model.md` (implementation plan)
- ADR-0016 (contract-first codegen + transport — unchanged, this is an application of it)
- ADR-0015 (superseded event-shape assumptions), ADR-0011/0012 (original lifecycle/transport)
- `docs/components/workbench-chat.md`, `docs/components/workbench-workspace.md` (block rendering)
- praxis `github.com/nathan-tsien/praxis`, tag `openapi-v0.3.0`; upstream `openapi/CHANGELOG.md`
- SSE union source remains generated; `crates/praxis-protocol` `StreamEvent` is the upstream owner
