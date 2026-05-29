# ROADMAP

Versioning here is intentionally lighter than cogito GA gates — nonetheless every slice must reconcile with **`docs/superpowers/specs/`**
and **`docs/adr/`** before execution.

Legend:

- **Committed** means maintainers formally accept executing now.
- **Deferred** waits on ADR/supersede + resource availability.

## Phase 1 — Visual shell + mocks (Committed)

Goals:

1. Turborepo + pnpm ergonomics stabilized (`pnpm lint|typecheck|build` truthful).
2. Three-pane UX shipped per ADR-0004 + **`docs/components/`** contracts.
3. Mock domain data lives in **`packages/shared`**, surfaced through `apps/web`.
4. No cogito transports, SSE/WebSockets (unless spec + roadmap advance).

Exit criteria excerpt (see Phase 1 spec for exhaustive list):

- Workbench behaves per component docs (`sidebar`, chat streaming placeholder, workspace cards).
- Light/dark/token story documented alongside actual CSS variables (update docs when palette shifts).

### Sub-slices inside Phase 1 (proposed sequencing)

Execute top-to-bottom unless maintainers reshuffle via ADR/note:

| ID | Deliverable |
|----|--------------|
| P1.1 | Monorepo hygiene (workspace manifests, Turbo tasks aligning every package scripts) |
| P1.2 | Route segments + shells (`/`, `/c/[conversationId]`, `/settings`) |
| P1.3 | Pane wiring + mocks + responsiveness hooks (still desktop-first) |

## Phase 2 — ash-server + streaming (Deferred)

Themes:

1. **`crates/ash-server`** (name negotiable via ADR) embedding cogito.
2. HTTP + SSE/WebSocket bridging (choose per ADR), auth posture, quotas.
3. Replace mocks with hardened data adapters + observability parity.

Blocked until roadmap owners accept **streaming ADR trio** (transport, session pinning, tenancy model).

### Phase 2 sub-slices (landed ahead of full Phase 2)

| ID | Deliverable | PR | Status |
|----|--------------|-----|--------|
| P2.1 | Auth IAM integration — `@ash/iam-client` package, BFF API routes, AuthContext, auth pages, middleware guard | #10 | **Committed + merged** |

> P2.1 delivers auth posture (registration, login, logout, password reset) against an external IAM service
> (`localhost:8090`) without touching cogito or `ash-server`. It was pulled forward because the web layer
> was ready and auth is a prerequisite for any user-facing feature work.
>
> Remaining Phase 2 themes (streaming, `crates/ash-server`, persisted session inventories) stay deferred
> until the streaming ADR trio is accepted.

## Phase 3 — Vertical packs (Deferred)

Office suite · self-media tooling · etc.; each requires **`featureRegistry`**
entries + Workspace extension ADR referencing payload contracts.

## Maintenance cadence reminders

Whenever scope slides:

1. Amend **`docs/superpowers/specs/2026-05-23-ash-startup-design.md`** or supersede via dated spec chunk.
2. Update ADRs (**supersede** rather than rewriting accepted statuses).
3. Refresh this table + align **Phase** headings.
