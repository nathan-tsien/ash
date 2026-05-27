# ADR-0010: Dark mode — unlock Phase 1 theme toggle

## Status

Accepted

## Context

ADR-0005 (DT-2) deferred dark mode: "no canonical `:root.dark` ships until QA + superseding ADR."
The workbench now has stable three-pane layout, semantic token coverage, and a personalization
settings section with disabled theme buttons. Unlocking dark mode completes a Phase 1 exit
criterion ("light/dark/token story documented alongside actual CSS variables").

## Decision

1. Author a `:root.dark` token block in `packages/ui/src/globals.css` using **inverted Manus neutrals**
   (dark canvas `#1a1918`, light text `#f0efed`, same tonal relationships as light palette).
2. Ship a custom **ThemeProvider** in `@ash/ui` (`packages/ui/src/lib/theme-provider.tsx`):
   - Persists user choice (`"light" | "dark" | "system"`) in `localStorage("ash-theme")`.
   - `"system"` resolves via `matchMedia("(prefers-color-scheme: dark)")`.
   - Toggles `.dark` class on `document.documentElement`.
   - Exposes `theme`, `resolvedTheme`, `setTheme` via React Context.
3. Inject a **blocking `<script>`** in the locale layout `<head>` to apply `.dark` before first paint,
   preventing flash of wrong theme.
4. Enable **Light / Dark / System** buttons in the Settings personalization section (remove Phase 2 badges).
5. Density and font selectors remain Phase 2 (disabled).

## Consequences

- Users can select dark mode from Settings > Personalization.
- Theme persists across reloads and syncs across tabs.
- System preference follows OS `prefers-color-scheme` live.
- Status badge colors (success, warning, destructive) unchanged — they use explicit Tailwind accents.
- Future theme variants (high-contrast, accent colors) remain deferred.

## References

- ADR-0005: Design tokens and Phase 1 visual discipline (DT-2 superseded for dark mode scope)
- `docs/visual-language-and-theme.md`: Palette specification
- `docs/superpowers/specs/2026-05-27-dark-mode-theme-toggle.md`: Design spec
