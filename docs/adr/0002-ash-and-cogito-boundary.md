# ADR-0002: ash product shell boundaries versus cogito runtime

## Status

Accepted

## Context

Upstream **cogito** canonical repository: **`https://github.com/nathan-tsien/cogito`**.

cogito declares itself an embeddable library; consumers own inbound networking, SSO, quotas, UX.

Users expect ash to supervise agents similarly to Claude Code semantics but visually closer to newer **agent workbench** metaphors,

while still delegating Harness correctness to cogito primitives.

Dragging cogito crates into SSR/React bundles violates safety + deployment ergonomics analogous to cogito forbidding accidental Hand imports inside Brain crates.

## Decision

Hard boundaries:

| Layer | May import cogito? | Responsibility |
|-------|---------------------|----------------|
| `apps/web` | **Never** directly | Compose UI, orchestrate mocks until API adapters exist |
| `packages/ui` | **Never** | Pure presentation primitives |
| `packages/shared` | **Never** | TS shapes + mocks (non-authoritative) |
| Planned `crates/ash-server` | **Yes (in-process)** | Terminate transports, authenticate, instantiate Runtime |

Frontend traffic always crosses **explicit protocol surfaces** (`HTTP/SSE`/WebSocket TBD).

## Consequences

- **Easier:** Frontend iteration decouples from toolchain churn inside cogito workspaces.
- **Harder:** Need schema discipline when TS diverges from Rust event logs — plan contract tests Phase 2+.
- **Given up:** “Single Next deployment embeds Harness via wasm/FFI hacks” shortcuts remain permanently off-scope unless a future superseding ADR reopens with threat modeling.
