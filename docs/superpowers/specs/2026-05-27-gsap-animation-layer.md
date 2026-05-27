# GSAP Animation Layer — Chat + Pane Transitions

Date: 2026-05-27
Status: Proposed
Scope: Phase 1 visual polish (no server work)

## Goal

Replace CSS-only keyframe animations with GSAP-powered motion for chat messages and pane transitions. Establish a reusable animation foundation in `apps/web` that respects the existing package layering (no GSAP in `packages/ui`).

## Non-goals

- No GSAP dependency in `packages/ui` or `packages/shared`
- No changes to mock data flow, routing, or i18n
- No ScrollTrigger, Draggable, or other GSAP plugins in this slice
- No dark mode animation differences (deferred per ADR-0005)

## Design decisions

### Where GSAP lives

`apps/web/src/lib/animations/` — application-level, not in the UI primitives package. Rationale: animation orchestration is application logic, analogous to how `packages/ui` has no fetching or auth. GSAP dependency stays scoped to `apps/web`.

### Reduced motion

`gsap.matchMedia()` with `(prefers-reduced-motion: reduce)` query, configured in `gsap-setup.ts`. All animations use `duration: 0` when active. Per GSAP best practice: matchMedia auto-reverts when conditions change, no manual cleanup.

### Interruptible animations

`overwrite: "auto"` on all defaults. When a user collapses a pane mid-expand, the new tween kills only overlapping properties on the same targets — no tween pile-up.

### Performance

Per GSAP performance skill: animate only `transform` (`x`, `y`, `scale`, `xPercent`, `yPercent`) and `autoAlpha`. No layout properties (`width`, `height`, `top`, `left`). Pane collapse uses `scaleX` with `transformOrigin` instead of CSS `width` — stays on compositor.

## Foundation

### Dependencies

```bash
pnpm --filter web add gsap @gsap/react
```

### `apps/web/src/lib/animations/gsap-setup.ts`

Register plugin, set project-wide defaults:

```ts
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

gsap.defaults({
  duration: 0.3,
  ease: "power2.out",
  overwrite: "auto",
});
```

### `apps/web/src/lib/animations/presets.ts`

Named animation presets returning GSAP vars:

| Preset | Properties | Ease | Duration |
|--------|-----------|------|----------|
| `messageEntrance` | `autoAlpha: 0->1`, `y: 8->0` | `power2.out` | 0.3s |
| `messageStagger` | Same + `stagger: 0.06` | `power2.out` | 0.3s each |
| `paneCollapse` | `xPercent` slide, children `autoAlpha -> 0` | `power3.out` | 0.25s |
| `paneExpand` | `xPercent` slide, children `autoAlpha -> 1` | `power2.out` | 0.35s |
| `contentFadeIn` | `autoAlpha: 0->1`, `y: 4->0` | `power2.out` | 0.2s |

## Chat animations

### Message entrance

New messages use `gsap.from()` with `messageEntrance` preset. A timeline coordinates entrance with auto-scroll to bottom:

```ts
const tl = gsap.timeline();
tl.from(newMessageRef, { autoAlpha: 0, y: 8, duration: 0.3 })
  .to(scrollContainerRef, { scrollTo: "max", duration: 0.3 }, "<");
```

### Staggered load

When entering a conversation, all visible messages stagger in:

```ts
gsap.from(".message-bubble", {
  autoAlpha: 0, y: 8, stagger: 0.06, duration: 0.3,
});
```

### Composer micro-interactions

- Focus: `scale(1.01)` on container, 0.2s `power2.out`
- Send button press: `scale(0.95)` down, spring back on release

### Thinking state

Replace static spinner with GSAP pulse: `scale` 0.95-1.05, `repeat: -1, yoyo: true`.

## Pane transitions

### Sidebar collapse

Timeline sequence:
1. Content children fade out (`autoAlpha: 0`) — 0.15s
2. Sidebar shrinks via `scaleX` + `transformOrigin: "left center"` — 0.25s `power3.out`
3. Collapsed rail icons fade in — 0.15s

Expand (reverse):
1. Rail icons fade out — 0.1s
2. Sidebar expands via `scaleX` — 0.35s `power2.out`
3. Content children fade in — 0.2s

### Workspace collapse

Same pattern, right side:
- Collapse: content fades -> panel slides right (`xPercent: 100`) -> FAB fades in
- Expand: FAB fades out -> panel slides from right -> content fades in

FAB entrance: `gsap.from(fabRef, { scale: 0.8, autoAlpha: 0, duration: 0.2 })`.

### Route transitions

Switching conversations is a Next.js route change (`/c/[id]`), which remounts the chat component. No explicit crossfade needed — the staggered message load on mount (see "Staggered load" above) provides the visual transition. The sidebar active-state highlight changes instantly via CSS.

## Files changed

| Component | Changes | Unchanged |
|-----------|---------|-----------|
| `workbench-chrome.tsx` | GSAP timelines for collapse/expand | Layout logic, state |
| `workbench-sidebar.tsx` | `scaleX` animation, content stagger | Search, list, focus mgmt |
| `workbench-workspace.tsx` | `xPercent` slide, FAB entrance | Cards, mock data |
| `workbench-chat.tsx` | Message entrance timeline, stagger, pulse | Send flow, mock data |
| `message-bubble.tsx` | Add `ref` prop for GSAP targeting | Layout, timestamps |
| `composer.tsx` | Focus/send micro-interactions | Textarea, Cmd+Enter |

New files: `gsap-setup.ts`, `presets.ts`, `index.ts` in `apps/web/src/lib/animations/`.

## Accessibility

- `prefers-reduced-motion: reduce` -> all animations use `duration: 0` (instant state changes)
- `gsap.matchMedia()` handles this automatically per GSAP skill
- Keyboard navigation (Tab, Enter, Escape) unaffected — animations are cosmetic only
- Existing `aria-label`, `aria-expanded`, focus outlines preserved

## Verification

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm --filter web dev` — visual verification in browser
4. Toggle `prefers-reduced-motion` in Chrome DevTools > Rendering — all animations skip
5. Keyboard-navigate through sidebar, chat, workspace — no focus traps
6. Collapse/expand sidebar and workspace mid-animation — no tween pile-up
7. Send a message — entrance animation plays, scroll to bottom is smooth

## Risks

| Risk | Mitigation |
|------|-----------|
| GSAP bundle size (~30KB gzipped) | Scoped to `apps/web`, tree-shakes unused plugins |
| SSR incompatibility | All GSAP code inside `useGSAP` (client-only), same pattern as existing `"use client"` components |
| Tween leaks on fast navigation | `useGSAP` auto-cleans on unmount; `overwrite: "auto"` kills overlapping tweens |
