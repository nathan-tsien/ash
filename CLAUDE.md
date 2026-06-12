# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative docs — read these first

This repo copies **cogito documentation discipline**:

1. **`AGENTS.md`** — Canonical agent manual: cogito-vs-ash boundary, Turborepo package layering,
   Phase gates, coding + testing norms, forbidden shortcuts.
2. **`ARCHITECTURE.md`** — Narrative layering + cogito juxtaposition.
3. **`ROADMAP.md`** — What is in-flight versus deferred gates.
4. **`docs/superpowers/specs/2026-05-23-ash-startup-design.md`** — Approved Phase 1 slice.
5. **`docs/components/*.md`** — Per-pane UX + payload contracts (**update alongside code changes**).
6. **`docs/design-guidelines.md`** + **ADR-0013** — Single normative design authority: rule IDs (PRIN/COLOR/TYPE/SPACE/MOTION/IA/UX/IMPL/REV), tokens, motion, review protocol, deviation register.
7. **`docs/adr/README.md` + numbered ADRs** — Record/supersede decisions like cogito’s ADR corpus.

Upstream runtime lives in **[github.com/nathan-tsien/cogito](https://github.com/nathan-tsien/cogito)** outside this repo.

Conflict resolution: **`AGENTS.md` beats `CLAUDE.md`**.

## What this repo is

**ash** ships the **Workbench UI**: Sidebar (inventory) + Chat + Workspace (plans/tools/artifacts).

**cogito** decides loop semantics (`SessionHandle`, event log correctness). ash decides presentation,
routing, quotas, SSO, infra — phased per roadmap.

ADR-0002 documents coupling strategy (server-only cogito linkage later).

## Inviolable rules (summarized — expand inside `AGENTS.md`)

1. No cogito import graph into browser-facing packages (`apps/web`, `packages/ui`).
2. Respect package layering analogous to cogito crates (UI vs shapes vs compositions).
3. Triple-pane UX semantics fixed per ADR-0004 unless superseded.
4. Respect Phase gates (no SSE/auth/server crates until roadmap + specs say so).
5. Token + visual discipline per **`docs/visual-language-and-theme.md`** / ADR-0005 (no rogue palette literals).

## Commands

Prefer declared scripts (`package.json` / `turbo.json`):

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm dev
pnpm --filter web dev
```

## Coding standards (workspace echoes of cogito)

- **`strict` TS** + ESLint baseline (`eslint-config-next` pattern).
- **Comments + developer logs**: English exclusively.
- **User-facing strings**: zh-CN baseline per product choice (distinct from prose docs).
- **No ornamental Unicode glyphs** masking as bullets (prefer ASCII numbering / `-`).
- Dependencies + turbo tasks behave like cogito `{ workspace = true }` hygiene — duplication must be deliberate.

Finish checklist enumerated under **`AGENTS.md` §What to do when you finish**.
