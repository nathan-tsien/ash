# ash Architecture

Normative layering for **product shell + future API host** juxtaposed against **cogito** Agent Runtime boundaries.

Companion docs:

- **`AGENTS.md`** — agent manual + layering rules  
- **`docs/adr/0002-ash-and-cogito-boundary.md`** — decision record tying responsibilities  
- **`docs/components/agent-workbench-shell.md`** — three-pane UX map

This file narrates positioning and repository layers; cogito internals remain authoritative in **[nathan-tsien/cogito](https://github.com/nathan-tsien/cogito)**.

## Positioning diagram

```
+-------------------------------------------------------------+
| ash (this repository)                                       |
| Web UX · routing · product modules · quotas (future)         |
+--------------------------+----------------------------------+
                           | Planned Phase 2+ HTTPS / SSE
+--------------------------v----------------------------------+
| crates/ash-server (future; not scaffolded yet)                |
| Session routing · cogito embedding · streaming adapters      |
+--------------------------+----------------------------------+
                           | in-process Rust API
+--------------------------v----------------------------------+
| cogito (upstream Rust Agent Runtime)                      |
| https://github.com/nathan-tsien/cogito                      |
| Brain Harness · ConversationStore · ModelGateway tooling    |
+-------------------------------------------------------------+
```

Phase **1**: only the top row ships user-visible artifacts; mocks substitute for server truth.

## Repository layers (`ash`)

### `apps/web`

- Next.js App Router entry.
- Compose packages, wires **locale-prefixed** routes (`/zh`, `/en`, `/[locale]/c/[conversationId]`, `/[locale]/settings`) via `next-intl` + [`src/proxy.ts`](apps/web/src/proxy.ts).
- Translation bundles live under [`messages/`](apps/web/messages); shared mock copy is split **zh/en** in `@ash/shared` (`getMockConversations`, `getConversation`, `formatRelativeTime(..., locale)`).
- Holds client boundaries (`"use client"` islands) sparingly — treat like cogito minimizes surface-area exposure.

Dependency direction: **`apps/web` → `packages/ui`, `packages/shared`**. Reverse edges forbidden.

### `packages/ui`

- Presentational primitives, tokens, Tailwind merges (`cn()` helpers).
- **No** fetching, **no** auth tokens, **no** domain saga logic.
- Mirrors philosophy of cogito crates that intentionally avoid importing unrelated layers.

### `packages/shared`

- TypeScript scaffolding for payloads + registry metadata + deterministic mocks/fixtures until API surfaces freeze.
- **No React / Next imports** — keeps SSR vs client portability + mirrors cogito’s strict crate graph discipline.

Future server contracts may codegen types here once OpenAPI/Event JSON schemas exist (requires ADR).

### `crates/` — reserved

Rust server crate(s) intentionally absent during Phase **1**. Introducing them mandates:

1. Matching roadmap gate + spec amendment.
2. New ADRs for transport/streaming/session routing (supersede placeholders if any).

### `docs/`

`docs/components/` parallels cogito **`docs/components/H0X`** pattern: descriptive behavior + payloads for each Harness slice — here describing UI panes plus extension slots.

## Horizontal concerns roadmap

| Concern | Phase 1 stance | Expected evolution |
|---------|----------------|--------------------|
| Internationalization | UI copy defaults zh-CN (`AGENTS.md`); docs English | Possibly message catalogs (`next-intl` or ICU) gated by roadmap |
| State management | Lightweight local/session store when needed | Sync with server SSE + optimistic policies under ADRs |
| AuthN/Z | Explicitly unavailable | SSO + tenant headers once server introduces contracts |
| Observability | Frontend error boundaries baseline | Correlate spans with ash-server traces later |
| Visual system | **`docs/visual-language-and-theme.md`** + ADR-0005 | Dark theme, accent brand hues, HC themes via superseding ADRs |

## Versioning stance

Treat **pnpm workspace + Turborepo** as analogous to cogito Cargo workspace — coordinate major bumps deliberately; annotate user-visible breakage in `CHANGELOG.md` once introduced.

## Related reading (cogito upstream)

Canonical runtime documentation lives in **`[cogito/ARCHITECTURE.md](https://github.com/nathan-tsien/cogito/blob/main/ARCHITECTURE.md)`** and ADRs under **`[cogito/docs/adr](https://github.com/nathan-tsien/cogito/tree/main/docs/adr)`** (e.g. harness / MCP governance). Never duplicate cogito internals here verbatim — link instead.
