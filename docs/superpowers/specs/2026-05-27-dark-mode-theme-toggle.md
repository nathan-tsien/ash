# Dark Mode — Theme Toggle Design

**Date:** 2026-05-27
**Status:** Accepted
**Phase:** 1 — Visual shell + mocks

Companion governance:

- Maintain alongside **`AGENTS.md`**, **`ROADMAP.md`**, **`docs/components/`**, **`docs/adr/`**
- Conflict resolution favors explicit ADRs + supersession rather than silently editing accepted history.

## Goal

Unlock a **Light / Dark / System** theme toggle in the Settings personalization section,
lifting the Phase 1 deferral gate from ADR-0005 (DT-2).

## Scope

| Included | Deferred |
|----------|----------|
| Dark palette (`:root.dark`) in `globals.css` | Density toggle (Comfortable / Compact) |
| ThemeProvider context in `@ash/ui` | Font selector |
| localStorage persistence + `prefers-color-scheme` detection | High-contrast theme variant |
| Blocking script for flash prevention | Accent color customization |
| Personalization section theme buttons enabled | |
| ADR-0010 documenting the decision | |

## Design

### 1. Dark Palette — Inverted Manus Neutrals

The dark palette inverts the Manus foundation trio while preserving tonal relationships.
All values authored in `:root.dark { ... }` inside `packages/ui/src/globals.css`.

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| `--background` | `#f8f8f8` | `#1a1918` | Dark canvas |
| `--foreground` | `#34322d` | `#f0efed` | Light text |
| `--card` | `#ffffff` | `#252423` | Elevated dark surface |
| `--card-foreground` | `#34322d` | `#f0efed` | |
| `--popover` | `#ffffff` | `#252423` | |
| `--popover-foreground` | `#34322d` | `#f0efed` | |
| `--primary` | `#34322d` | `#f0efed` | Inverted: light on dark |
| `--primary-foreground` | `#ffffff` | `#1a1918` | Dark on light primary |
| `--secondary` | `#ebeae8` | `#2a2928` | |
| `--secondary-foreground` | `#34322d` | `#f0efed` | |
| `--muted` | `#f0efed` | `#252423` | |
| `--muted-foreground` | `#706e69` | `#a09e9a` | Lighter for dark bg readability |
| `--accent` | `#eae9e7` | `#2a2928` | |
| `--accent-foreground` | `#34322d` | `#f0efed` | |
| `--destructive` | `#c53030` | `#e55050` | Brighter for dark bg contrast |
| `--border` | `#e4e4e1` | `#333230` | |
| `--input` | `#e4e4e1` | `#333230` | |
| `--ring` | `rgba(52,50,45,0.28)` | `rgba(240,239,237,0.28)` | |
| `--sidebar` | `#ffffff` | `#1e1d1c` | Slightly darker than canvas |
| `--sidebar-foreground` | `#34322d` | `#f0efed` | |
| `--sidebar-border` | `#ecebe9` | `#2a2928` | |
| `--sidebar-accent` | `#f4f3f2` | `#2a2928` | |
| `--workspace` | `#fafafa` | `#201f1e` | Slightly lighter than canvas |

Status badge variants (success, warning) keep their explicit Tailwind accents unchanged.

### 2. ThemeProvider (`packages/ui/src/lib/theme-provider.tsx`)

Lives in `@ash/ui` as a presentation primitive.

**State model:**

```
type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"
```

**Behavior:**

- `theme` persisted in `localStorage("ash-theme")`, defaults to `"system"`
- `"system"` resolves via `window.matchMedia("(prefers-color-scheme: dark)")`
- Toggles `.dark` class on `document.documentElement`
- Exposes via React Context: `theme`, `setTheme`, `resolvedTheme`
- SSR: `useSyncExternalStore` server snapshot returns `"light"` (avoids hydration mismatch)
- Listens for `prefers-color-scheme` changes when theme is `"system"`

**Exports from `@ash/ui`:**

- `ThemeProvider` component
- `useTheme()` hook

### 3. Flash Prevention

A blocking `<script>` injected in `apps/web/src/app/[locale]/layout.tsx` `<head>` reads localStorage
and applies `.dark` to `<html>` before first paint. This prevents the light-to-dark flash
on page load for users who previously selected dark or system (with dark OS preference).

The script:
1. Reads `localStorage.getItem("ash-theme")`
2. If `"dark"` → add `.dark` to `document.documentElement`
3. If `"system"` → check `matchMedia("(prefers-color-scheme: dark)")`, add `.dark` if matches
4. If `"light"` or missing → do nothing (light is default)

### 4. Integration Points

**Locale layout (`apps/web/src/app/[locale]/layout.tsx`):**
- Wrap children with `<ThemeProvider>`
- Add blocking script to `<head>`

**Root layout (`apps/web/src/app/layout.tsx`):**
- No changes — remains a pass-through

**Personalization section (`personalization-section.tsx`):**
- Remove `disabled` and Phase 2 badges from theme buttons
- Wire to `useTheme()` — clicking calls `setTheme(light|dark|system)`
- Visual selected state already works via `aria-pressed` + conditional class

### 5. Documentation Updates

| File | Change |
|------|--------|
| `docs/adr/0010-dark-mode-theme-toggle.md` | New ADR documenting the decision |
| `docs/visual-language-and-theme.md` | Add `:root.dark` token table in §5, update §5.6 from placeholder to reference, update §7 checklist |
| `docs/adr/0005-*` | Add note referencing ADR-0010 as supersession for dark mode scope (DT-2) |
| `docs/components/workbench-workspace.md` | Verify no dark-mode-specific interaction notes needed |

## Acceptance Criteria

1. `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
2. Theme toggle in Settings personalization section works: Light, Dark, System.
3. Theme persists across page reloads (localStorage).
4. System option follows OS `prefers-color-scheme` changes live.
5. No flash of wrong theme on page load (blocking script).
6. All semantic tokens render correctly in both themes (manual spot-check: sidebar, chat, workspace).
7. `docs/visual-language-and-theme.md` reflects the dark palette.
8. ADR-0010 committed with Status: Accepted.
9. ADR-0005 updated with cross-reference to ADR-0010.
