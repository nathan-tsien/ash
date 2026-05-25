# Settings — global modal (no route)

Purpose: document the Settings modal IA, section contracts, and mock data dependencies for Phase 1.

## Context

Settings is a **global Dialog modal** — not a dedicated Next.js route. It is triggered from the Sidebar **`FooterAccount`** control and rendered via a provider mounted inside **`WorkbenchChrome`**.

Phase 1 does **not** support URL deep-linking to a specific settings section. Section selection is client state only.

Real authentication, tenant-scoped preferences, and billing integration remain deferred per [ADR-0009](../adr/0009-tenancy-model.md). Account and billing sections display mock data only.

## Layout

| Region | Spec |
|--------|------|
| Shell | `@ash/ui` `Dialog`, `max-w-4xl`, centered overlay with semantic tokens |
| Left nav rail | ~`220px` fixed width; two group headers: **Account**, **Features** |
| Right panel | Scrollable section content; one section visible at a time |

Nav items map 1:1 to section IDs below. Active item uses accent background per theme tokens.

## Section contract

| Section ID | i18n key prefix | Phase 1 fidelity | Phase 2 follow-up |
|-----------|----------------|------------------|-------------------|
| `account` | `Settings.Account` | Display-only profile (name, email, avatar from mocks) | SSO profile sync, org switcher |
| `general` | `Settings.General` | Real locale + theme toggles (client state) | Server-persisted preferences |
| `billing` | `Settings.Billing` | Display-only plan summary | Stripe / quota integration |
| `personalization` | `Settings.Personalization` | Real toggles (local persistence TBD) | Cross-device sync |
| `scheduled-tasks` | `Settings.ScheduledTasks` | Mock list from `@ash/shared`; pause/resume UI stubs | ash-server CRUD + cron engine |
| `skills` | `Settings.Skills` | Mock list; enable/disable toggles (`requiresPhase2` gates disabled) | cogito capability registry |
| `connectors` | `Settings.Connectors` | Mock list; connect/disconnect button stubs | OAuth flows + MCP server management |

## Mock domain types

Types live in [`packages/shared/src/types.ts`](../../packages/shared/src/types.ts):

| Type | Mock getter |
|------|------------|
| `ScheduledTask` | `getMockScheduledTasks(locale)` |
| `AgentSkill` | `getMockSkills(locale)` |
| `Connector` | `getMockConnectors(locale)` |

These types are **scaffolding only** — not authoritative API contracts. They will be superseded when ash-server OpenAPI / event schemas freeze. Do not treat mock shapes as runtime source of truth (see [ADR-0002](../adr/0002-ash-and-cogito-boundary.md)).

## Trigger + provider wiring

```
FooterAccount (Sidebar)
  └─ onClick → SettingsProvider.open()
       └─ SettingsModal (Dialog)
            ├─ SettingsNav (left rail)
            └─ SettingsSection* (right panel)
```

Provider mounts inside `WorkbenchChrome` so the modal is available on `/`, `/c/[id]`, and any future workbench routes.

## Dependencies

| Package | Imports |
|---------|---------|
| `@ash/ui` | `Dialog`, `Switch`, `DropdownMenu`, `Button`, `Badge`, … |
| `@ash/shared` | Mock getters + domain types |

## See also

- [Agent Workbench Shell](./agent-workbench-shell.md) — global routing; `/settings` route removed.
- [Workbench Sidebar](./workbench-sidebar.md) — `FooterAccount` placement.
- [2026-05-26 settings + showcase spec](../superpowers/specs/2026-05-26-settings-and-showcase-demo.md) — approved amendment charter.
