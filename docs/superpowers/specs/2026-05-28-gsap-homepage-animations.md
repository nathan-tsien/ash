# GSAP Homepage Animations — Design Spec

**Status:** Accepted
**Date:** 2026-05-28

## 1. Goal

Replace the current CSS-only entrance animations on the marketing homepage with GSAP-powered scroll-driven and timeline-based animations. Maintain the project's "composed, high legibility, low visual noise" philosophy.

## 2. Approach

Use `@gsap/react` `useGSAP` hook + GSAP `ScrollTrigger` plugin. Keep data fetching in server components; extract animated UI into client components.

## 3. Animation Inventory

### 3.1 Hero Timeline Sequence

GSAP `timeline()` with staggered entrance:

1. Kicker — `y: 20, opacity: 0` → origin, `0.6s`
2. Title — split by line, `y: 30, opacity: 0` staggered `0.15s` per line
3. Body — `y: 20, opacity: 0` → origin
4. Workbench mockup — `scale: 0.95, opacity: 0` → origin, internal 3-column stagger
5. CTA buttons — `y: 15, opacity: 0` → origin

Easing: `power3.out`. Total ~2.5s.

### 3.2 Scroll-Triggered Sections

All use ScrollTrigger with `start: "top 85%"`, `toggleActions: "play none none none"`.

| Section | Animation | Stagger |
|---------|-----------|---------|
| Highlights cards | `y: 40, opacity: 0` → origin | `0.12s` |
| Showcase cards | `y: 40, opacity: 0` → origin | `0.1s` |
| Docs/Pricing cards | `x: ±30, opacity: 0` → origin | parallel |
| Bottom CTA | `y: 30, opacity: 0` → origin | — |

### 3.3 Hover Micro-Interactions

GSAP tweens replace CSS `transition-all`:

- HighlightCard: `scale: 1.02, y: -4`
- TeaserTile: `scale: 1.02, y: -4` + arrow `x: 4`
- CTA buttons: `scale: 1.03` elastic

### 3.4 Reduced Motion

Detect `prefers-reduced-motion` in `useGSAP` context. If active, skip all GSAP animations — elements render at final state immediately.

## 4. File Changes

| File | Action |
|------|--------|
| `apps/web/src/lib/gsap.ts` | **New** — plugin registration + defaults |
| `apps/web/src/components/animations/scroll-reveal.tsx` | **New** — generic scroll fade-in wrapper |
| `apps/web/src/components/animations/stagger-group.tsx` | **New** — staggered children wrapper |
| `apps/web/src/components/animations/hero-timeline.tsx` | **New** — hero entrance timeline |
| `apps/web/src/components/animations/text-split.tsx` | **New** — line-by-line text animation |
| `apps/web/src/components/animations/parallax.tsx` | **New** — subtle parallax wrapper |
| `apps/web/src/app/[locale]/(marketing)/page.tsx` | **Modify** — integrate GSAP components |

## 5. Constraints

- No new npm dependencies (GSAP already installed)
- All colors via design tokens — no rogue literals
- Respect `prefers-reduced-motion`
- Maintain existing i18n structure
- Keep server/client boundary minimal
