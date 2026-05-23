# ADR-0001: Monorepo layout (Turborepo + pnpm)

## Status

Accepted

## Context

ash bundles:

- Multiple TypeScript workspaces sharing UI primitives and domain mocks.
- A future Rust service crate bridging cogito (`crates/` not yet scaffolded).

We must avoid copy/paste primitives, drifted dependency majors, or opaque developer commands.

We mirror cogito discipline: deterministic workspace manifests + scripted quality gates,

## Decision

Operate a **`pnpm`** workspace orchestrated via **Turborepo**:

| Path | Role |
|------|------|
| `apps/web/` | Consumer Next.js surfaces |
| `packages/ui/` | Shared design primitives + globals |
| `packages/shared/` | Domain typing + mocks (TS only) |

Introduce **`crates/ash-*`** inside the **same mono git** once Phase 2 starts; Turborepo may layer `cargo`

tasks later via explicit ADR (**do not prematurely wire** invisible scripts).

Rust builds remain independent from cogito versioning — treat cogito checkout as Cargo path dependency when server crate ships.

## Consequences

- **Easier:** consistent dependency graph, Turborepo cache hits, reproducible onboarding story.
- **Harder:** every new workspace member must integrate into **`turbo.json`** + manifests remain synchronized.
- **Given up:** The zero-config single-app ergonomics (`create-next-app` alone) vanish intentionally.
