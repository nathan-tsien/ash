# Settings Modal + Showcase Demo — Phase 1 Amendment

**Date:** 2026-05-26  
**Status:** Accepted  
**Phase:** 1 amendment (visual shell + mocks; no cogito integration)

## Status

Accepted as a Phase 1 amendment to the startup design spec. Supersedes the standalone `/settings` route stub. Real authentication and tenant-scoped settings remain deferred per [ADR-0009](../../adr/0009-tenancy-model.md).

## Context

Phase 1 shipped a detached `/settings` page as a minimalist placeholder outside the triple-pane workbench. Product IA now calls for:

1. **Global Settings modal** — opened from the Sidebar identity footer (`FooterAccount`), not a dedicated route. Two nav groups (**Account** / **Features**) with seven scrollable sections.
2. **Showcase demo banner** — a low-cost "open example" affordance that deep-links into existing mock conversations via `/c/[id]?demo=<caseId>` and renders a dismissible narrative banner at the top of the workbench.

The previous `/settings` route offered no integration with the workbench chrome and broke the "everything happens in-context" mental model. Moving settings into a modal keeps the triple-pane shell intact while surfacing account, billing, and feature-configuration surfaces that will eventually wire to ash-server.

Mock domain types for scheduled tasks, agent skills, and connectors are **scaffolding only** — they are not API contracts and may change when Phase 2 server schemas freeze. See [ADR-0002](../../adr/0002-ash-and-cogito-boundary.md) for the browser/runtime boundary.

## Decision

### Settings modal IA

| Group | Section ID | 中文标签 (reference) | Phase 1 fidelity |
|-------|-----------|---------------------|------------------|
| Account | `account` | 账户 | Display-only profile from mocks |
| Account | `general` | 通用 | Real locale / theme toggles (client state) |
| Account | `billing` | 计费 | Display-only plan summary |
| Account | `personalization` | 个性化 | Real toggles (local persistence TBD) |
| Features | `scheduled-tasks` | 定时任务 | Mock list + pause/resume UI stubs |
| Features | `skills` | 技能 | Mock list + enable/disable toggles |
| Features | `connectors` | 连接器 | Mock list + connect/disconnect stubs |

Layout contract:

- Modal shell: `@ash/ui` `Dialog`, `max-w-4xl`, centered overlay.
- Left nav rail: ~`220px`, group headers **Account** / **Features**.
- Right panel: scrollable section content; section selected via client state (no URL deep-link in Phase 1).

Trigger: Sidebar `FooterAccount` click → open modal. Provider mounted inside `WorkbenchChrome`.

### Showcase demo mechanic

| Element | Behavior |
|---------|----------|
| Entry URL | `/c/[conversationId]?demo=<caseId>` |
| Case mapping | `showcaseCaseMap` in `@ash/shared` mocks |
| Banner | Top-of-workbench narrative strip; copy from `ShowcaseReplay` i18n namespace |
| Exit | Clear `?demo` query param (router replace); banner unmounts |

Showcase cases (Phase 1):

| Case ID | Conversation | Narrative theme |
|---------|-------------|-----------------|
| `case1` | `conv-1` | Q2 roadmap research |
| `case2` | `conv-2` | Creator content planning |
| `case3` | `conv-3` | Weekly report prep |
| `case4` | `conv-4` | Vendor compliance screening (Risk / 合规初筛) |

### New mock domain types (NON-AUTHORITATIVE)

Declared in `packages/shared/src/types.ts`:

| Type | Purpose |
|------|---------|
| `ScheduledTask` | Cron-style recurring agent jobs |
| `AgentSkill` | Toggleable capability bundles |
| `Connector` | External integration status |

Each ships with bilingual mock arrays and `getMock*(locale)` getters under `packages/shared/src/mocks/`.

### UI primitives added to `@ash/ui`

| Component | Radix dependency |
|-----------|-----------------|
| `dialog.tsx` | `@radix-ui/react-dialog` |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` |
| `switch.tsx` | `@radix-ui/react-switch` |

All follow existing shadcn-style wrappers with `data-slot` attributes and semantic Tailwind tokens from `globals.css`.

### Scope tables

#### Included (this amendment)

| Item | Detail |
|------|--------|
| Spec + component docs | This file, `docs/components/settings.md`, shell doc update |
| `@ash/ui` primitives | Dialog, DropdownMenu, Switch |
| `@ash/shared` types + mocks | ScheduledTask, AgentSkill, Connector, showcase mapping |
| Mock conversation | `conv-4` (compliance screening) in zh + en bundles |
| i18n growth | ~120 new keys across Settings + ShowcaseReplay namespaces (web follow-up) |

#### Explicitly deferred

| Item | Rationale |
|------|-----------|
| `/settings` route | Replaced by modal; route deleted in web follow-up |
| Settings URL deep-link | Phase 2 — requires auth + shareable state |
| Live scheduled-task CRUD | Requires ash-server + cogito |
| Real connector OAuth | ADR-0009 tenancy + auth gate |
| Showcase analytics | Product telemetry not in Phase 1 |

## Consequences

### Positive

- Settings accessible from any workbench view without route churn.
- Showcase demo reuses existing mock conversations — no new runtime paths.
- New Radix primitives available workspace-wide for future palettes and menus.

### Negative / trade-offs

- **Deletes `/settings` route** — bookmarks break; acceptable for Phase 1 stub.
- **No settings deep-link** — support docs cannot link to a specific section until Phase 2.
- **Mock types may drift** — consumers must treat `ScheduledTask` / `AgentSkill` / `Connector` as UI scaffolding until OpenAPI schemas land.
- **i18n bundle growth** — zh + en dictionaries grow ~120 keys; maintain parity in web follow-up.

### Dependency additions

```
@radix-ui/react-dialog        ^1.1.7
@radix-ui/react-dropdown-menu ^2.1.7
@radix-ui/react-switch        ^1.1.4
```

## Cross-references

- [ADR-0009: Tenancy model](../../adr/0009-tenancy-model.md) — auth deferred; account section is mock-only.
- [ADR-0002: ash and cogito boundary](../../adr/0002-ash-and-cogito-boundary.md) — browser never imports cogito; mocks are not runtime truth.
- [Agent Workbench Shell](../../components/agent-workbench-shell.md) — routing table updated; showcase query param documented.
- [Settings component doc](../../components/settings.md) — modal layout + section contract.

## Implementation ordering

1. **Foundation (this task):** spec, `@ash/ui` primitives, `@ash/shared` types + mocks, component docs.
2. **Web follow-up:** Settings modal composition, Showcase banner, i18n keys, delete `/settings` route, wire `FooterAccount` trigger.

## See also

- [2026-05-23 ash startup design](./2026-05-23-ash-startup-design.md) — parent Phase 1 charter.
- [Workbench Sidebar](../../components/workbench-sidebar.md) — `FooterAccount` trigger location.
