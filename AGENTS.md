# AGENTS.md

This file is the **operating manual for AI coding agents** working on this repository.
Read this first, every time, before making changes.

## What this project is

**ash** is the **product shell** for a general-purpose Agent **web workbench**: a
Manus-inspired **three-pane** layout (conversation list · chat · workspace: plan,
tools, artifacts). Implementation uses **Next.js App Router**, **pnpm + Turborepo**,
and a **shadcn/ui-style** component package.

**[cogito](https://github.com/nathan-tsien/cogito)** is an embeddable
**Agent Runtime** (Rust). It exposes no HTTP UI and owns no end-user authentication.
Future **ash-server** consumes cogito **in-process** behind an HTTP/streaming API.

ash does NOT embed cogito inside the browser, and does NOT treat `packages/shared`
types as the server source of truth (they are scaffolding until API contracts lock).

Normative UX + layering: **`docs/components/`**, approved scope **`docs/superpowers/specs/2026-05-23-ash-startup-design.md`**.  
Normative visuals + chroma discipline: **`docs/visual-language-and-theme.md`** + **ADR-0005**.

See also `ARCHITECTURE.md`, `README.md`.

## Documentation conventions (aligned with cogito)

- **`AGENTS.md` / `CLAUDE.md` / `README.md` / `ARCHITECTURE.md`**: English.
- **`docs/adr/`** and **`docs/components/`**: English (`## Status`, `## Context`,
  `## Decision`, `## Consequences` mirror cogito ADR style).
- **`docs/superpowers/specs/`**: may combine English norms with stakeholder language;
  conflicts resolve by opening a new ADR or updating the component doc.
- **User-visible UI strings** (`apps/web`): default locale **zh-CN** unless otherwise specified.
- **All code comments** (`//`, `/* */`, `///`) **must be English** (same rationale as cogito `CLAUDE.md`).

**Noise rule (same spirit as cogito):** Do not use ornamental bullets or numbering glyphs
(for example circled digits, dingbats, heavy checkmarks as decoration) as list markers or emphasis in prose.
Use ASCII `1.` / `2.` for ordered lists and `-` for bullets.

**Diagram exception:** ASCII box drawing inside fenced diagrams may use `|` + `-` corners when encoding layout only.

## Inviolable design principles

Violating these is never the right shortcut. **Stop and ask** if tempted.

### 1. Product boundary: ash versus cogito

- **Browser bundles** (`apps/web`, `packages/ui`) **must not depend on cogito**.
- **`packages/shared`** holds TypeScript shapes and mocks only; Rust event schemas win at runtime.
- **Phase 2+** consumes cogito only from server-side Rust (planned `crates/ash-server`).
  See **`docs/adr/0002-ash-and-cogito-boundary.md`**.

### 2. Crate / package layering

| Location | Holds | Forbidden |
|---------|-------|-----------|
| `packages/ui` | Presentational primitives, theme, `cn()` | Next routing, fetching, domain/session orchestration logic |
| `packages/shared` | Shared types, `featureRegistry`, fixtures/mocks | `react`, `next/*` imports |
| `apps/web` | Routes, compositions, adapters to data | Duplicating primitives that belong in `@ash/ui` |

If something could live in `packages/ui`, **put it there** instead of swelling `apps/web`.

### 3. Workbench IA is fixed until ADR

Three panes (**Sidebar · Chat · Workspace**) are the MVP layout (ADR-0004). Panels may collapse, but responsibilities may not silently merge without a replacement ADR.

### 4. Phase gate

Per the approved Phase 1 spec:

- Do **not** ship cogito-backed streaming, SSE/WebSockets, OAuth, tenancy, or `crates/` server code unless the spec + ADRs are updated **first**.

### 5. Theme + visual discipline (Phase 1)

- Palette + radii authored **only** in **`packages/ui/src/globals.css`**; consumers use semantic utilities (`bg-sidebar`, `text-muted-foreground`, …).
- **No unsanctioned hex / rgb** in `apps/web` for branded surfaces — deviations require English `TODO(ash-visual)` + review.
- **Dark theme literals** (`:root.dark` or equivalent) do **not** ship until a dedicated ADR + doc update (**`@custom-variant dark` stays inert outside experiments**).

Details: **`docs/visual-language-and-theme.md`**.

## Coding standards

- **Language:** TypeScript `strict`; avoid `any` (prefer `unknown` + narrowing).
- **React:** Prefer Server Components; use `"use client"` only where the browser APIs or interaction model require it — keep boundaries small.
- **Styling:** Tailwind + semantic tokens defined in **`packages/ui/src/globals.css`** (**`docs/visual-language-and-theme.md`**, ADR-0005). Arbitrary HEX / rgb brand literals in pages are forbidden without documented escape.
- **Logs:** Messages in **English**. Never log secrets, cookies, bearer tokens.
- **Errors:** Prefer typed results or narrowed errors up the adapter layer — no naked `alert()` in reusable components.
- **Imports:** Respect workspace aliases; no deep imports that bypass exported package surfaces.
- **Formatting:** ESLint (`eslint-config-next`) baseline when configured; formatting via Prettier-equivalent tooling when wired to scripts.
- **Dependencies:** Prefer adding transitive deps once at workspace root discipline (discuss duplicate majors in review).

Do **not**:

- Bypass lint or typecheck gates with `@ts-expect-error`/`eslint-disable` without a one-line rationale comment (English).
- Commit `.env`, API keys, or machine-local paths pointing to private infra.

### Testing posture (explicit divergence from cogito defaults)

**cogito** requires exhaustive tests immediately. **ash** follows:

| Phase | Expectation |
|-------|--------------|
| **Phase 1 (visual shell + mocks)** | Tests only when explicitly requested **or** when covering non-trivial client logic isolated from mocks. Never `test.skip` solely to unblock CI without an ADR/superhuman approval note. |
| **Phase 2+ (live API contracts)** | New **transport adapters / schema surfaces** arrive with regression tests — treat equivalently to “new cogito trait, contract tests mandatory.” |

Never mark integration “production-ready” without citing the roadmap + relevant ADRs.

## Workspace rules

- Add dependencies via the owning `package.json`. Prefer intentional dedupe; flag unexplained duplicate majors.
- **Do not mutate `packages/ui` imports from `packages/shared`** — violates layering (mirrors cogito Brain cannot import Hands directly).
- **Turborepo** graph is canonical for CI tasks — declare new scripts there versus one-off undocumented CLI recipes.

## Commands you should know

```bash
pnpm install                     # hydrate workspace

pnpm dev                         # turborepo dev orchestration

pnpm lint && pnpm typecheck && pnpm build   # local gate expectation

pnpm --filter web dev            # tighten loop during UI tweaks
```

## What to do when you finish a task

1. `pnpm lint`, `pnpm typecheck`, `pnpm build` succeed for impacted members.
2. Update **`docs/components/*.md`** if visible behavior / payloads drifted.
3. Update **`docs/adr/`** if architecture intent changed (**supersede** rather than rewriting accepted history).
4. Keep **`docs/superpowers/specs/`** truthful relative to observable behavior once shipping user-visible slices.

## When you are uncertain

Valid moves:

- Ask the maintainer.
- Sketch the simplest implementation + annotate `// TODO(ash): ...` rationale in English.
- Draft an ADR before irreversible scaffolding.

Never valid moves:

- Merging Sidebar + Workspace mental models without rewriting docs + ADR.
- Bypassing layering “temporarily”.
- Claiming completeness while lint/typecheck fail.

## Current phase pointer

Follow **`docs/superpowers/specs/2026-05-23-ash-startup-design.md`** gates plus **`ROADMAP.md`** ordering.

## Patience note

Node + Next compilations resemble long `cargo` cold builds — killing random `node`/`pnpm` watchers can wedge `.next`/turbo caches; prefer orderly shutdown documented in tooling once stable.
