# ADR-0006: Data adapter seam in apps/web

## Status

Accepted

## Context

Phase 1 routes and server components import `getMockConversations` and `getConversation` directly from `@ash/shared`. That scatters the future swap point for live data across six call sites in `apps/web`.

When Phase 2 introduces `crates/ash-server`, pages should not need to know whether data comes from mocks or HTTP/SSE adapters. A single seam keeps the `@ash/shared` package as scaffolding only (per ADR-0002) while `apps/web` owns transport-facing adapters.

## Decision

Introduce **`apps/web/src/server/conversations.ts`** as the sole server-side entry for conversation inventory and active session lookup:

- `listConversations(locale)` — sidebar + marketing CTA resolution
- `getActiveConversation(id, locale)` — workbench route hydration

The module imports `"server-only"` to prevent accidental client bundling. Pages and server components call these functions; they must not import mock loaders from `@ash/shared` directly.

Phase 1 implementations delegate to existing `@ash/shared` mocks unchanged. Phase 2 replaces internals with ash-server fetch/SSE adapters without touching route signatures.

## Consequences

- **Easier:** One directory to swap when cogito-backed APIs land; route files stay stable.
- **Harder:** Thin async wrapper adds indirection during Phase 1; marketing pages must `await` list calls.
- **Deferred:** Client-side optimistic updates and streaming deltas remain out of scope until transport ADRs (0007+) are accepted.
