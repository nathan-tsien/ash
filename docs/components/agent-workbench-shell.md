# Agent Workbench Shell — global framing

Purpose: unify cross-pane ergonomics mandated by ADR-0004 with routing expectations from the Phase 1 spec.

## Routes

| Path | Shell behavior |
|------|----------------|
| `/` | Marketing / onboarding / “new mission” empties · may tuck Workspace placeholders |
| `/c/[conversationId]` | **Full triple-pane**: conversation id aligns with `Conversation.id` mock until API persists |
| `/c/[conversationId]?demo=<caseId>` | Same triple-pane; renders top banner with showcase narrative; exit clears the query |

**Settings** is a global modal triggered by `FooterAccount` in the Sidebar — no dedicated route (replaces former `/settings` stub).

Reserve query-driven focus swaps (example `?focus=workspace`) for future charters — undocumented until specs adopt them.

## Grid + sizing

| Column | Approx width | Notes |
|--------|--------------|-------|
| Sidebar | `260px` + collapse to rail `~56px` | Persist collapse preference client-side eventually |
| Chat | fluid `flex: 1 1 auto` | maintain comfortable reading measure |
| Workspace | `380px` default, collapsible to `0` (per SPACE-4 in `docs/design-guidelines.md`) | optional floating toggle / FAB parity |

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
| `Meta+K` / `Ctrl+K` | Invoke command palette (cmdk-based, with search + keyboard nav) |
| `Enter` inside composer | Send message |
| `Shift+Enter` inside composer | Insert newline |

Document additional chords inside each pane-specific file when localized.

Ensure icon-only controls expose `aria-label` + Tooltip (zh-CN copy).

### Focus management

Collapsed rails must expose focus order + `aria-expanded` consistent with Sidebar toggling.

## Data sourcing (Phase 1)

Hydrate via **`apps/web/src/server/conversations.ts`** (ADR-0006), which delegates to **`@ash/shared` mocks** in Phase 1. Future API ingestion swaps adapter internals only — payloads described here remain contract unless ADR adjusts.

Implementation layout under **`apps/web/src/components/workbench/`**:

| Module | Role |
|--------|------|
| `workbench-shell.tsx` | Server entry composing chrome + workspace panel |
| `workbench-chrome.tsx` | Client orchestrator (workspace collapse + FAB + command palette wiring) |
| `command-palette/` | cmdk-based command palette (provider + component) |
| `sidebar/` | Left inventory rail |
| `chat/` | Center conversation column |
| `workspace/` | Right audit rail (Plan / Tools / Artifacts) |

### Accessibility mandates

Semantic landmarks (`nav`, `main`, `aside` equivalents acceptable). Maintain visible focus outlines via shared `ring` tokens.

## GSAP animation layer

Sidebar collapse/expand and Workspace collapse/expand use GSAP timelines instead of CSS transitions. Sidebar slides between the full width and rail width; Workspace slides via `xPercent`. Composer focus and send-button press also use GSAP micro-interactions. Message copy button uses GSAP scale bounce. Scroll-to-bottom button uses GSAP fade animation. Command palette entrance uses GSAP fromTo animation. `prefers-reduced-motion` is honored via `gsap.globalTimeline.timeScale(1000)` set under `gsap.matchMedia()` in `gsap-setup.ts` — this collapses every tween (including ones with explicit per-call durations) to effectively instant; scrubbed ScrollTriggers are position-linked rather than time-based, so scroll-driven effects (Parallax) additionally skip creating their triggers under the same media query. Shared animation utilities live in `apps/web/src/lib/animations/`.

## See also

- [workbench-sidebar.md](./workbench-sidebar.md)
- [workbench-chat.md](./workbench-chat.md)
- [workbench-workspace.md](./workbench-workspace.md)

