# ADR-0019: praxis 0.4.0 history chronological page ordering

## Status

Accepted (2026-06-20)

Amends ADR-0018 (praxis 0.3.0 block model): item 4's "newest-first page reversed" render
contract is superseded by the ascending page order below. Everything else in ADR-0018 (the
`StreamEvent` block stream, `MessagePage`/`Message`/`ContentBlock` shapes, the near-identity
fold) stands. Keeps ADR-0016 (contract-first codegen + transport) in force.

## Context

praxis published contract **0.4.0** (tag `openapi-v0.4.0`, 2026-06-20), classified **breaking
(within-page item order) + a server-side pagination correctness fix** in the upstream CHANGELOG.

- `GET /v1/tasks/{id}/history`: `MessagePage.items` are now ordered **ascending (oldest first,
  chronological)** within a page — matching how a client renders a conversation top-to-bottom
  (and claude.ai's ordering). In 0.3.0 the items were newest-first and the client was expected
  to reverse each page.
- Pagination direction is **unchanged**: pages still walk newest -> older across calls (the
  first cursor-less call returns the newest page; follow `next_before_seq` and **prepend** older
  pages as the user scrolls up). The cursor is the oldest seq returned on the page.
- The correctness fix (no message dropped, repeated, or split across a page boundary) is
  entirely server-side; the client gets stronger guarantees for free.
- **No schema/field/type change.** `Message`, `MessagePage`, and `next_before_seq` are identical
  in shape; only the within-page item order and the server pagination changed. The regenerated
  `generated.ts` differs only in doc strings.

## Decision

1. Re-sync the vendored contract to the **0.4.0** tag and regenerate types (doc-string-only diff).
   The `sync:praxis` pinned tag default moves to `openapi-v0.4.0`.

2. Stop reversing each history page. `history-projection.ts` (`historyToTask`) folds `items`
   as-is, oldest-first — the page is already chronological. The bespoke `[...items].reverse()`
   is gone; the optimistic-message reconcile still folds oldest-first, so its order stays stable.

3. **Prepend** older pages during multi-page catch-up. The re-attach loop in `task-run-provider.tsx`
   accumulates with `items.unshift(...page.items)` instead of `push`, so the concatenated array
   stays chronological across the page boundary regardless of how many pages are walked. Ordering
   responsibility lives in exactly one place (the accumulation), matching the contract algorithm.

## Consequences

- History renders top-to-bottom directly from each page; the client no longer mirrors the page
  order. The two coordinated changes (no per-page reverse + prepend across pages) are covered by
  the `history-projection` unit tests (ascending fixtures) and a `task-run-provider` test that
  asserts a two-page catch-up stays chronological (`m0,m1,m2`) — the latter fails if the older
  page is appended instead of prepended.
- No view-model or type change. Single-page consumers (fake client, http-client tests) are
  unaffected beyond fixture/order wording.
- The server-side pagination correctness fix means multi-page sessions no longer drop or split
  turns; no client mitigation was ever shipped for that bug, so nothing is removed.

## Related

- ADR-0018 (praxis 0.3.0 block model — item 4 render contract amended here)
- ADR-0016 (contract-first codegen + transport)
- `docs/components/workbench-chat.md` (history catch-up render)
- praxis `github.com/nathan-tsien/praxis`, tag `openapi-v0.4.0`, `openapi/CHANGELOG.md` (0.4.0), PR #60
