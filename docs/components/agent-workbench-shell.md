# Agent Workbench Shell — global framing

Purpose: unify cross-pane ergonomics mandated by ADR-0004 with routing expectations from the Phase 1 spec.

## Routes

| Path | Shell behavior |
|------|----------------|
| `/` | Marketing / onboarding / “new mission” empties · may tuck Workspace placeholders |
| `/c/[conversationId]` | **Full triple-pane**: conversation id aligns with `Conversation.id` mock until API persists |
| `/settings` | Detached minimalist surface (**no triple-pane**) — return affordance still reachable |

Reserve query-driven focus swaps (example `?focus=workspace`) for future charters — undocumented until specs adopt them.

## Grid + sizing

| Column | Approx width | Notes |
|--------|--------------|-------|
| Sidebar | `260px` + collapse to rail `~56px` | Persist collapse preference client-side eventually |
| Chat | fluid `flex: 1 1 auto` | maintain comfortable reading measure |
| Workspace | `360px` default, collapsible to `0` | optional floating toggle / FAB parity |

Separate columns with subtle `border` tokens — never rely on opacity-only separation for color-blind readability.

Collapse animation target `200–260ms ease-out`; honor `prefers-reduced-motion`.

## Layering (`z-index` draft)

1. Background shell tint
2. Scrollport content (panes themselves)
3. Local overlays (`Popover`, `Dropdown`, ephemeral tooltips)
4. Global shells (`⌘K` palette, dialogs, forthcoming mobile drawers)

## Keyboard affordances

| Shortcut | Intent |
|---------|--------|
| `Meta+K` / `Ctrl+K` | Invoke command palette (**Phase 1 may stub**) |
| `Meta+Enter` / `Ctrl+Enter` inside composer | Send message |

Document additional chords inside each pane-specific file when localized.

Ensure icon-only controls expose `aria-label` + Tooltip (zh-CN copy).

### Focus management

Collapsed rails must expose focus order + `aria-expanded` consistent with Sidebar toggling.

## Data sourcing (Phase 1)

Hydrate purely from **`@ash/shared` mocks**. Future API ingestion swaps adapters only beneath `apps/web` — payloads described here remain contract unless ADR adjusts.

### Accessibility mandates

Semantic landmarks (`nav`, `main`, `aside` equivalents acceptable). Maintain visible focus outlines via shared `ring` tokens.

## See also

- [workbench-sidebar.md](./workbench-sidebar.md)
- [workbench-chat.md](./workbench-chat.md)
- [workbench-workspace.md](./workbench-workspace.md)

