# ADR-0005: Design tokens and Phase 1 visual discipline

## Status

Accepted

## Context

ash lacked a single normative artifact listing **color roles, discipline, and review gates** for the web stack.
Without that, ad-hoc HEX in `apps/web` would erode cohesion.
We also follow cogito-style documentation: commitments should be **explicit and reviewable**.

## Decision

Phase 1 locks **neutral / near-neutral SaaS chroma**, explicitly **anchored on the public Manus brand foundation** (**`#34322D`**, **`#F8F8F8`**, **`#FFFFFF`** per [brand assets](https://manus.im/brand)), routed entirely through **`packages/ui/src/globals.css`**

using **HEX literals** (`:root`) + Tailwind **`@theme inline`** aliases — plus derived neutrals documented in **`docs/visual-language-and-theme.md`**.

Mandatory rules:

| ID | Rule |
|----|------|
| DT-1 | `apps/web` **must rely on semantic utility tokens** derived from `:root`; raw brand hex absent except documented escapes |
| DT-2 | **`.dark`** CSS surface exists only as tooling hook (**`@custom-variant dark`**); **no canonical dark palette** ships until QA + superseding ADR. **Superseded for dark mode scope by ADR-0010.** |
| DT-3 | Workbench geography requires dedicated tokens **`sidebar*`** family + **`workspace`** separate from **`background`** parity |
| DT-4 | **`--primary` / `--primary-foreground`** follow **Manus Black on White** inversion for solid CTAs (no unrelated saturated hues) |
| DT-5 | Status semantics (success / warning / destructive) may deviate chromatically only through **named badge / status utilities** already aligned in UI package |

Authoritative narrative spec: **`docs/visual-language-and-theme.md`**.

## Consequences

- **Easier:** uniform Manus-like discipline without hiring a brand agency first.
- **Harder:** adding marketing accent color now demands doc + ADR churn (intentional friction).
- **Deferred:** high-contrast theme, accent color customization (each future ADR).
- **Unlocked (ADR-0010):** dark palette parity, user-selectable theme (Light / Dark / System).
