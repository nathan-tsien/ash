# ash Startup Design — Visual Shell + Design System

**Date:** 2026-05-23  
**Status:** Accepted  
**Phase:** 1 — Visual fidelity + mocks (no cogito integration yet)

Companion governance:

- Maintain alongside **`AGENTS.md`**, **`ROADMAP.md`**, **`docs/components/`**, **`docs/adr/`**
- Conflict resolution favors explicit ADRs + supersession rather than silently editing accepted history.

## Goal

Establish **ash** as the cogito-aligned **product-facing Agent Workbench**.

Phase 1 optimizes credible Manus-esque three-pane ergonomics (**Sidebar · Chat · Workspace**),

scaffolded atop **pnpm + Turborepo**, **Next.js App Router**, and **shadcn-compatible** primitives housed in **`packages/ui`**.

**cogito** remains an external Rust workspace embedding target for Phase **2** servers — see ADR-0002.

## Product positioning

| Theme | Guidance |
|-------|----------|
| Core SKU | Universal Agent assistant surface ("chat + supervision") |
| Future modules | Vertical packs (office suite, indie media pipelines, …) register through `featureRegistry` + Workspace overlays |
| Runtime truth | **cogito** inside future Rust binaries — ash never falsifies Harness semantics |

## Scope

### Included (Phase 1)

| Item | Detail |
|------|--------|
| Monorepo | `pnpm workspace` orchestrated via Turborepo |
| Frontend | Next.js App Router (`apps/web` tracks published Next.js major semver) |
| Shared UI | `packages/ui` theme tokens (`globals.css` entry) |
| Contracts | Shared TS mocks + scaffolding types (`packages/shared`) |
| Layout | Sidebar + conversational column + Workspace column (collapsible allowances per ADR-0004)
| Signals | Synthetic plan rows, synthetic tool traces, synthetic artifact previews |
| Routes | `/` welcome, `/c/[id]` cockpit, `/settings` stub |
| Default human UI language | zh-CN surfaced strings |

### Explicitly deferred (Phase 1)

| Item | Rationale |
|------|-----------|
| cogito bridging | awaits `crates/ash-server` + streaming ADRs |
| Auth / tenancy | product + legal posture |
| Live transports | SSE / WebSockets until security review |
| Mobile-first ergonomics | requires dedicated IA ADR |

## Physical repository map

```
ash/
├── apps/web/
├── packages/ui/
├── packages/shared/
├── docs/
│   ├── superpowers/specs/
│   ├── adr/
│   └── components/
├── turbo.json
└── pnpm-workspace.yaml
```

Rust surface (future):

```
crates/ash-server/    # Embedding cogito + terminating HTTP transports (charter gated)
```

## Layout matrix

| Pane | Rough width | Core contents |
|------|-------------|---------------|
| Sidebar | ~260 px (rail ~56 px collapsed) | Home affordances · search · session table · identity |
| Chat | Fluid | Threads + composer |
| Workspace | ~360 px (collapsible flush) | Plan checklist · traces · artifact deck |

Detailed interaction + motion language lives in **`docs/components/`**.

### Visual lineage (Manus-inspired)

Desktop-first fidelity:

- Whisper-light borders, generous whitespace, purposeful pill CTAs referencing Manus onboarding surfaces.
- Inter / geometric sans stacks (fallback to Geist if configured downstream).
- Subtle kinetic transitions respecting reduced-motion OS flags.

Avoid purely chromatic separators — pair borders or spacing rhythm with color cues for accessibility parity.

### Visual language

Chroma, typography rhythm, elevation, motion, and PR acceptance live in **`docs/visual-language-and-theme.md`** (ADR-0005). Layout and pane behavior stay in **`docs/components/`**.

## Tech selections

| Layer | Choice |
|-------|--------|
| Monorepo orchestration | Turborepo |
| Rendering | Next.js App Router |
| Presentation | Tailwind CSS v4 + locally vendored shadcn-derived primitives (`packages/ui`)
| Temporary state ergonomics | Zustand (only when idiomatic simpler than lifted React state — YAGNI)
| Mock ingestion | deterministic modules exporting fixtures (network calls absent until Phase 2)
| Languages | Docs + code comments English; UI strings zh-CN baseline

## Routing table

| Path | Experience |
|------|------------|
| `/` | Onboarding / new mission zero state |
| `/c/[conversationId]` | Primary triple-pane cockpit |
| `/settings` | Detached minimalist settings placeholder |

## Feature extension scaffolding

Declare capabilities via `packages/shared/src/features/index.ts` until dynamic loading exists.

Workspace reserves extension slots keyed by **`FeatureId`** without expanding permanent outer rails (`AGENTS.md` principle #3 reinforces).

Document each module introducing visible chrome inside both **`docs/components/workbench-workspace.md`** and **`ROADMAP.md`**.

## Phase 2 preview blueprint (non-binding)

Implementation depends on superseding ADRs, but directional expectations:

| Milestone | Action |
|-----------|--------|
| `crates/ash-server` bootstrap | Cargo workspace membership + cogito via **`git` dependency** targeting [`github.com/nathan-tsien/cogito`](https://github.com/nathan-tsien/cogito) (or a local checkout of same rev when developing server code) |
| Transport | Likely SSE for transcript deltas (`SessionHandle::subscribe`) — finalize via dedicated ADR |
| Catalog | Persisted session inventories replace mocks |
| Contracts | Possibly generate TS types via OpenAPI or JSON schemas mirroring cogito exported event JSON |

## Acceptance criteria shorthand

Phase 1 done when:

1. Repo scripts (`pnpm lint|typecheck|build`) truthful for wired packages.
2. Triple-pane aligns with **`docs/components/*`** textual contracts.
3. No accidental cogito crates inside browser-facing dependency graphs (**lint guard future optional**).

### Post-acceptance note

**Auth pulled forward to Phase 2 (P2.1)** — PR #10 landed IAM auth integration (registration, login,
logout, password reset) against an external IAM service (`localhost:8090`). This does not violate Phase 1
exit criteria: no cogito crates were introduced, auth is a pure web-layer BFF pattern. The "Auth / tenancy"
deferral in the table above was about posture/readiness, not a hard gate. Auth is now a prerequisite for
all user-facing feature work. See `ROADMAP.md` Phase 2 sub-slices.

