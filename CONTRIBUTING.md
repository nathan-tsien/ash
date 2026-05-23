# Contributing

Human-oriented companion to **`AGENTS.md`**. Automated agents obey `AGENTS.md` first — this guide adds collaborator etiquette.

## Start here

1. Read **`AGENTS.md`** boundary + layering rules (mirrors cogito discipline).
2. Skim **`ROADMAP.md`** for allowable scope.
3. If changing layout or chrome color: **`docs/visual-language-and-theme.md`** + **ADR-0005**.
4. Open relevant **`docs/components/*.md`** + ADRs touching your change.

## Local workflow

```bash
pnpm install
pnpm dev                   # optionally `pnpm --filter web dev`

pnpm lint
pnpm typecheck
pnpm build
```

Treat failures like cogito **`make ci`** red status — unblock before review.

## Expectations lifted from cogito norms

| Practice | ash interpretation |
|---------|---------------------|
| Update component docs alongside behavior deltas | Applies to **`docs/components/*.md`** |
| Palette / token drift | **`docs/visual-language-and-theme.md`** + **ADR-0005** must stay in sync with `globals.css` |
| Prefer ADRs for architectural reversals | Add `docs/adr/XXXX-*.md` + index entry |
| English developer commentary | Code comments/logs English; zh-CN strictly user strings |
| No ornamental Unicode bullets inside prose | ASCII enumerations |

## Reviews

Screenshots/video optional but welcomed for sizable UI motion. Describe data contract impact if mocks diverge.

## Git policy

Owners decide commit cadence. Do **not** assume maintainers auto-commit AI runs — obey repository owner instructions + hooks.
