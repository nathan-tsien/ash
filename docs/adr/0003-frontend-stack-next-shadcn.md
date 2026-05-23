# ADR-0003: Phase 1 frontend stack (`Next.js` App Router + shadcn-compatible UI)

## Status

Accepted

## Context

Goals:

- Accessible components with Radix-style ergonomics (**shadcn-style** clones live under `packages/ui`).
- Maintainability for multi-vertical modules (later office / media overlays).
- Server rendering defaults analogous to SSR-friendly surfaces (Next App Router idioms).

Alternative stacks (SPA-only `Vite`) lose first-class layouts + streamed metadata patterns Phase 2 will lean on,

so rejection mirrors cogito rejecting “thin CLI-only surface” forever.

## Decision

Baseline stack:

| Concern | Choice |
|---------|--------|
| Framework | `Next.js` App Router (**track semver via `apps/web/package.json`; currently 16.x**) |
| Styling engine | Tailwind CSS v4 + CSS variables defined in `@ash/ui` globals |
| Component kit | Locally vendored primitives under `packages/ui` (radix peer deps enumerated per component) |

Default UI copy locale = **zh-CN** (product-facing), orthogonal to docs language policy.

SSR remains default Component mode; escalate to **`"use client"`** narrowly when hooking gestures, virtualization, websocket clients, etc.

## Consequences

- **Easier:** ecosystem alignment (Vercel shadcn recipes, AI assistants familiar tooling).
- **Harder:** must police client boundary explosions (performance + SSR mismatch).
- **Given up:** Emotion-heavy CSS-in-libraries as canonical styling path Phase 1 (supersede if design system pivots).

Semantic color roles + visual review gates defer to **`docs/adr/0005`** and **`docs/visual-language-and-theme.md`** (orthogonal to picking Next.js).


