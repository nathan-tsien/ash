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
| [0014](./0014-ash-native-identity.md) | ash-native visual identity ("Ash & Ember") |
| [0015](./0015-praxis-0.1.5-interactive-execution.md) | praxis 0.1.5 interactive execution (`ask_user` + same-session history catch-up) |
| [0016](./0016-contract-first-codegen-and-transport.md) | Contract-first codegen and transport alignment |
| [0017](./0017-praxis-0.2.0-skill-discovery-and-hints.md) | praxis 0.2.0 skill discovery + hints at task start |
| [0018](./0018-praxis-0.3.0-block-model.md) | praxis 0.3.0 block-oriented stream + history model (`StreamEvent` / `MessagePage`) |
| [0019](./0019-praxis-0.4.0-history-chronological-ordering.md) | praxis 0.4.0 history chronological (ascending) page ordering |
| [0020](./0020-workspace-process-and-deliverables.md) | workspace IA — pinned plan + Process/Deliverables tabs (amends 0004) |
| [0021](./0021-praxis-task-outputs-contract.md) | praxis `task_outputs` typed-deliverable contract (Proposed, upstream-gated) |

### Reserved band

Next free IDs (**0022+**) cover workspace extension packs, mobile IA, etc. — claim sequentially here when filing.

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
