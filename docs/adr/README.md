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

### Reserved band

Next free IDs (**0007+**) cover transports, tenancy, streaming adapters, canonical dark palettes, etc. — claim sequentially here when filing.

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
