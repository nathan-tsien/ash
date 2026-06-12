# Architecture Decision Records

We adopt Michael Nygard’s ADR process: short-lived markdown artifacts capturing reversible intent.

## Documentation rules (borrowed from cogito)

| Rule | Applies here |
|------|----------------|
| English prose | ADR titles + narratives |
| Sections | `Status`, `Context`, `Decision`, `Consequences` |
| Tone | Operational, terse, factual |
| Decorative glyphs | Forbidden as list gimmicks (`AGENTS.md` noise rule); ASCII enumerations OK |
| Supersede | Prefer new ADR with `Superseded by` note instead of mutating Accepted history silently |

Cross-link cogito runtime ADRs (**[nathan-tsien/cogito](https://github.com/nathan-tsien/cogito)**, esp. **`docs/adr/`** there) whenever ash decisions depend on Harness contracts — do **not** fork their text.

## Index

| ADR | Title |
|-----|-------|
| [0001](./0001-monorepo-layout.md) | Turborepo + pnpm workspace layout |
| [0002](./0002-ash-and-cogito-boundary.md) | Product shell boundaries versus cogito runtime |
| [0003](./0003-frontend-stack-next-shadcn.md) | Phase 1 web stack (`Next.js` + Tailwind/shadcn) |
| [0004](./0004-agent-workbench-three-pane-ux.md) | Three-pane workbench UX + extension slots |
| [0005](./0005-design-tokens-and-visual-discipline-phase-1.md) | Phase 1 design tokens + visual discipline |
| [0006](./0006-data-adapter-seam.md) | Data adapter seam in `apps/web` |
| [0007](./0007-transport-sse-vs-websocket.md) | Transport selection — SSE vs WebSocket (Accepted: SSE) |
| [0008](./0008-session-pinning-and-routing.md) | Session pinning and routing (Proposed) |
| [0009](./0009-tenancy-model.md) | Tenancy model (Proposed) |
| [0010](./0010-dark-mode-theme-toggle.md) | Dark-mode theme toggle |
| [0011](./0011-praxis-contract-and-live-task-execution.md) | praxis contract adoption + first live task-execution slice |
| [0012](./0012-praxis-live-transport.md) | Real praxis transport + BFF SSE proxy |
| [0013](./0013-consolidated-design-guidelines.md) | Consolidated design guidelines as single normative authority |

### Reserved band

Next free IDs (**0014+**) cover workspace extension packs, mobile IA, etc. — claim sequentially here when filing.

## Template

```
# ADR-XXXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-YYYY

## Context
What pressures exist?

## Decision
What concrete choice resolves them?

## Consequences
Easier paths, heavier obligations, purposeful trade-offs.
```

## Numbering convention

Increase monotonic IDs. Closing an ADR without replacement sets `Deprecated`; supersession links both ways.
