# ash

> Working motto — *Rebuild from ashes with intent.*
>
> **Product-facing Agent Workbench**: Manus-inspired **three-pane** UI (conversation list · chat · structured workspace).

ash is where humans steer autonomous work: conversational control in the middle, audited **plans,
tool traces, and artifacts** on the right, task inventory pinned left. Orchestration primitives live in
pair project **cogito** (Rust Agent Runtime checkout, commonly `~/x/projects/cogito`). cogito stays transport-
and UI-free; ash owns transports, quotas, SSO, frontend craft.

## Contents

- **Workbench shell** — Sidebar + Chat + Workspace (collapsible).
- **`packages/ui`** — shadcn-style primitives + ash theme tokens (`globals.css` entry).
- **`packages/shared`** — TypeScript domain scaffolding, mocks, `featureRegistry`.
- **`apps/web`** — Next.js：`/` 营销站、`/product`、`/showcase`、`/docs`、`/pricing`；工作台 `/c/[id]`，`/settings` 占位。
- **Documentation** mirroring cogito ergonomics (`AGENTS.md`, `docs/components`, `docs/adr`, **`docs/visual-language-and-theme.md`**).

## Status

Phase **1**: visual fidelity + mocks only (streaming/auth/server crates intentionally absent — see roadmap + ADRs).

## Quick start

### Prerequisites

```bash
node -v           # Expect Node.js 20+

pnpm -v           # Expect pnpm 10+ (`package.json#packageManager` pins exact range)
```

### Install

```bash
pnpm install
```

### Dev

```bash
pnpm dev                 # Turborepo fan-out

pnpm --filter web dev    # Next-only tightening loop
```

### Quality gates (mirror cogito diligence)

Before claiming completeness:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Documentation map

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Mandatory handbook for autonomous agents |
| `CLAUDE.md` | Claude Code fast-path reading order |
| `ARCHITECTURE.md` | System layering + cogito juxtaposition |
| `CONTRIBUTING.md` | Human collaborator notes + checklist alignment |
| `ROADMAP.md` | Accepted slices versus deferrals |
| `docs/components/` | Pane UX + payload specs |
| `docs/visual-language-and-theme.md` | Phase 1 chroma roles, typography, spacing, elevation, motion, acceptance checklist |
| `docs/adr/` | Decision records (**0005** = token discipline) |
| `docs/superpowers/specs/2026-05-23-ash-startup-design.md` | Phase 1 charter |

## Licensing

Unset — clarify before external distribution.
