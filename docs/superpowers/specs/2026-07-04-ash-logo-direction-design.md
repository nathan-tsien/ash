# Ash Logo Direction Design

- Status: Implemented: LogoMark landed; favicon/app icon export pipeline landed
- Date: 2026-07-04
- Scope: Ash product icon and logo-mark direction
- Relates: ADR-0014, `docs/design-guidelines.md`, `packages/ui/src/components/wordmark.tsx`

## Context

Ash now has a named visual identity, "Ash & Ember", and a styled-text wordmark:
`ash.` with an ember period. That solved the borrowed Manus palette problem, but it did not
give the product a memorable icon. The current brand can look disciplined and premium, but it
does not yet have a distinctive symbol that users can recognize in a favicon, app icon,
sidebar rail, loading state, or marketing surface.

The product system has three layers:

| Layer | Meaning | Brand role |
|-------|---------|------------|
| Cogito | "I think" | The intelligent decision-making core |
| Praxis | Practice / action | The SaaS backend that operationalizes Cogito |
| Ash | Human-facing product | A personal AI secretary for work and life |

This means Ash should not look like a raw model, a backend engine, or another generic AI chat
product. Ash is the surface people meet directly. Its icon should express a calm, capable,
private assistant that stays close to the user and handles tasks with care.

## Design Problem

Manus has a strong icon archetype: the hand. That works because it is human, memorable, and
immediately tied to action. Ash needs a similarly ownable archetype, but it must not copy Manus
or use a hand. Early AI-generated explorations around abstract embers, circles, route paths, and
geometric task cores were useful for searching, but they were too generic or carried unwanted
readings: eye, house, shield, leaf, cat ears, document app, or ordinary SaaS icon.

The next logo work should therefore start from a clear archetype rather than keep asking image
models for arbitrary marks.

## Decision

Use **Companion Shadow + Task Core** as the Ash icon direction.

The icon should feel like a quiet presence beside the user: not a face, mascot, or hand, but an
abstract companion silhouette that contains a readable work/task core. A small ember point remains
as the living intelligence inside the composed shell.

In plain terms:

- **Companion Shadow** gives Ash a human-facing memory hook without becoming cute.
- **Task Core** keeps the mark tied to practical work and private secretary behavior.
- **Ember Point** links the icon back to the existing Ash & Ember identity.

This direction is implemented as controlled vector geometry in the `LogoMark` component. Static
SVG favicon and app-icon exports are generated from the same geometry and the canonical light
tokens in `packages/ui/src/globals.css`.

Implementation landed as `LogoMark` in `packages/ui/src/components/logo-mark.tsx`; static
favicon/app-icon export landed through `apps/web/scripts/brand-assets.mjs`, which writes
`apps/web/src/app/icon.svg`, `apps/web/public/ash-icon.svg`, and
`apps/web/public/ash-maskable-icon.svg`.

## Mark Anatomy

The final icon should have three parts:

| Part | Purpose | Constraints |
|------|---------|-------------|
| Outer companion silhouette | Ownable outline; reads as calm presence | Charcoal ink, simple, strong at 16px, not a shield/house/circle-only mark |
| Inner task core | White negative space suggesting workspace, fold, or entrusted task | Must not read as eye, leaf, bird, flame, document-only icon, or route/path |
| Ember point | Small brand accent and "living intelligence" cue | Ember token only, tiny and intentional, never a functional status color |

The icon should work in these contexts:

- favicon and browser tab
- app icon / PWA icon
- collapsed sidebar rail
- sidebar brand row next to the existing `ash.` wordmark
- loading state or empty-state brand moment
- marketing hero and social preview

## Visual Rules

The mark must:

- Be vector-first and implementable as SVG / React component.
- Use existing brand colors: charcoal ink, stone paper, white negative space, and ember.
- Keep ember scoped to brand expression per COLOR-10.
- Work in light and dark themes.
- Stay legible at 16px, 24px, 32px, and 64px.
- Remain mostly monochrome; ember is an accent, not the main shape.
- Be simple enough to redraw from geometry, not image trace noise.

The mark must not use:

- Hands, because that competes with Manus.
- Faces, eyes, mascots, animals, robots, brains, chat bubbles, sparkles, or generic AI symbols.
- Literal flame-only imagery.
- A logo that depends on the letter A.
- House, shield, crosshair, target, leaf, bird, route/path, document-only, or hexagon-tech cliches.
- Gradients, shadows, 3D, texture, neon, or photorealism.

## Relationship To Existing Wordmark

`packages/ui/src/components/wordmark.tsx` remains valid. The logo mark is an addition, not a
replacement. The expected brand lockups are:

1. **Icon only** - favicon, app icon, collapsed sidebar rail.
2. **Icon + `ash.`** - sidebar brand row, marketing header, auth header.
3. **`ash.` only** - allowed where space is tight or the mark would be redundant.

The ember period in the wordmark stays. If the icon also uses an ember point, the combined lockup
must avoid visual double-accent noise by sizing the icon ember smaller than the wordmark period.

## Implementation Shape

`LogoMark` has landed as the production vector primitive for the Companion Shadow + Task Core
direction. It is the source for current in-app brand placement and the basis for future static
assets.

Implemented asset work:

1. Export token-safe SVG favicon and app icon assets from the `LogoMark` vector source.
2. Wire `apps/web/src/app/manifest.ts` to advertise the generated app icons.

Deferred implementation work:

1. Add optional `BrandMark` or `LogoLockup` exports only when consumers need an icon + wordmark
   primitive.
2. Refine sizing, optical balance, or placement rules when new brand surfaces expose real layout
   needs.

## Files Likely To Change Later

- `packages/ui/src/components/wordmark.tsx` - possible lockup export or documentation update.
- `apps/web/src/app/icon.svg` - generated browser icon from the `LogoMark` vector source.
- `apps/web/public/ash-icon.svg` and `ash-maskable-icon.svg` - generated app icon assets.
- `apps/web/public/*` - social image assets if required.
- `docs/adr/0014-ash-native-identity.md` - amendment noting icon addition if architecture intent changes.
- `docs/components/*` - affected brand placement docs.

## Acceptance Criteria

- The selected mark can be recognized at favicon size.
- The mark has a clear Ash-specific archetype: Companion Shadow + Task Core.
- It does not look like Manus, a hand, a face, an eye, a shield, a home icon, or generic AI/SaaS.
- It works with the existing `ash.` wordmark.
- It respects COLOR-1, COLOR-2, COLOR-10, TYPE-6, and PRIN-6.
- It is delivered as controlled vector geometry, not as a raster trace from image generation.

## Deferred Review Question

Should social preview imagery use the same generated vector pipeline, or should it wait for a
separate composition pass with marketing page imagery?
