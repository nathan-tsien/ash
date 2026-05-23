# Visual Language, Theme Discipline, and Color Tokens (Phase 1)

Normative companion to **`packages/ui/src/globals.css`**, **`docs/adr/0005-design-tokens-and-visual-discipline-phase-1.md`**,
and the workbench **`docs/components/`** notes.

## 1. Design intent

| Axis | Direction |
|------|-----------|
| Product metaphor | Agent **workbench** (tasks, audits, artifacts) rather than novelty chat skins |
| Lineage | **Manus-aligned UI**: product chrome maps to **[Manus brand foundation](https://manus.im/brand)** (**`#34322D` / `#F8F8F8` / `#FFFFFF`**) plus derived neutrals — not a verbatim clone of marketing sites |
| Brand posture Phase 1 | Manus-style **minimal neutral system** plus functional reds only for destructive UX |
| Emotional tone | Composed, high legibility, low visual noise |

## 2. Theme discipline (non-negotiable)

1. **Single source of truth** for color and radii shape: **`packages/ui/src/globals.css`**. Semantic Tailwind aliases come from **`@theme inline`** there.
2. Application surfaces (`apps/web`) **consume tokens only**: `bg-background`, `text-foreground`, `border-border`, `ring-ring`, **`bg-sidebar`**, **`bg-workspace`**, etc.  
   Arbitrary HEX / `rgb(...)` strings in pages or feature components **for brand colors are forbidden**.
3. Truly one-off escapes (embedded third-party iframes, syntax-highlighter internals) MUST carry an English `TODO(ash-visual): rationale` beside the deviation.
4. **Dark scheme** palettes for production are **unset in Phase 1**. The `@custom-variant dark` hook exists for tooling, but shipping a canonical `:root.dark` theme requires a superseding charter plus a contrast QA matrix (ADR + this document updated together).
5. Any **semantic alias change** (`--muted`, `--sidebar-accent`, ...) requires updating **`docs/visual-language-and-theme.md` § Semantic token table**, then regenerating rationale in **ADR supersession**.
6. **Icons** inherit `currentColor`; prefer `text-muted-foreground` / `text-foreground`.
7. **Motion** favors `ease-out`; honor **`prefers-reduced-motion`** (collapse animations already specified in **`docs/components/agent-workbench-shell.md`** guidance).

Documentation noise rule aligns with **`AGENTS.md`** — ornamental Unicode bullet glyphs stay out.

## 3. Typography

| Role | Guidance |
|------|----------|
| Primary stack | **DM Sans** (`next/font/google`) — Manus-listed UI sans (**`apps/web`** `layout.tsx` → `--font-dm-sans`) chained into **`--font-sans`** inside **`globals.css`** |
| CJK stack | **Noto Sans SC** (`--font-noto-sc`) as next fallback alongside DM Sans (Manus cites Noto families for broader scripts) |
| Monospace stack | **Geist Mono** (`--font-geist-mono`) for condensed code / mono chips until a bespoke mono is chosen |
| Interface scale | Use Tailwind **`text-[11px]`–`text-sm`** sparingly inside dense rails; headings stay light weight |
| Line length | Prefer **narrow central column (~max-w-3xl)** inside Chat for readability |

Mixed **zh-CN** UI + Latin tool names stays allowed; fallback line-height errs toward **leading-relaxed**.

## 4. Density, rhythm, elevation

| Token | Guidance |
|-------|----------|
| Spacing rhythm | **4 px base**: favor `gap-2`, `p-3`, `p-4` (`0.25 rem` granularity) |
| Corner radius core | **`--radius: 0.75rem`** (12 px equivalent) defines card + shell rounding |
| Elevation metaphor | Borders first (**hairline ~1 px** semantics via `border-border`); **`shadow-xs` / soft `shadow-sm`** only where affordance parity demands lift (primary pill CTA)
| Divider | Prefer `<Separator>` + border tokens versus extra gray blocks |

## 5. Semantic color roles — Manus foundation + derivatives

Marketing palette (canonical names from Manus assets page):

| Swatch role | HEX | Mapped semantic tokens |
|-------------|-----|------------------------|
| Manus Black (`#34322D`) | ink + solid fills | `--foreground`, `--primary`, sidebar / card text hues |
| Manus Gray (`#F8F8F8`) | canvas humidity | `--background` |
| Manus White (`#FFFFFF`) | elevated sheets | `--card`, `--popover`, **`--sidebar` chrome** |

Derived neutrals (not brand-primary swatches — tuned for separators + accessibility):

| Token | HEX (Phase 1) | Notes |
|-------|---------------|-------|
| `--border`, `--input` | `#e4e4e1` | hairline separators on gray canvas |
| `--muted` | `#f0efed` | subdued tray wash |
| `--muted-foreground` | `#706e69` | body-secondary (darker than press `#bababa` for legible captions) |
| `--secondary` | `#ebeae8` | conversational user rails |
| `--accent` | `#eae9e7` | sidebar row hover parity |
| `--workspace` | `#fafafa` | right audit gutter vs pure white rails |
| `--ring` | `rgba(52,50,45,0.28)` | focus derived from ink hue |

**`--destructive`** uses an accessible functional red (**`#c53030`**) orthogonal to neutral trio.

### 5.1 Core surfaces (unchanged semantics)

| Token | Typical usage | Tailwind examples |
|-------|---------------|-------------------|
| `--background` | App canvas | `bg-background` |
| `--foreground` | Primary text ink | `text-foreground` |
| `--muted` | Inset tracks / zebra rows sparingly | `bg-muted`, `bg-muted/30` |
| `--muted-foreground` | Secondary labels, captions | `text-muted-foreground` |
| `--card` | Chat bubbles / raised panels | `bg-card` |
| `--border`, `--input` | Hairlines, field chrome | `border-border` |
| `--ring` | Focus rings / keyboard affordance | `ring-ring`, `outline-ring/*` |

### 5.2 Interactive / intent

| Token | Typical usage |
|-------|---------------|
| `--accent` | Row hover washes, low emphasis emphasis |
| `--accent-foreground` | Text atop accent washes |
| `--secondary` | User bubble muted fill / secondary ghost surfaces |
| `--secondary-foreground` | Text on secondary |
| `--destructive` | Irrecoverable hazards, destructive actions |
| **`--primary`** / **`--primary-foreground`** | **Manus Black** ink fill + **White** foreground — parity with Manus monochrome interactive buttons |

### 5.3 Workbench geography

Ash adds chrome-only tokens (**ADR-0005** rationale):

| Token | Pane | Notes |
|-------|------|-------|
| `--sidebar*` | Sidebar | Slightly tinted paper separating inventory |
| `--workspace` | Right audit rail | Slightly tinted paper distinguishing structured trace |

Maintain **readable contrast**: sidebar text rests on **`--sidebar-foreground`**; never pure gray-on-gray without verifying contrast.

Concrete **HEX / RGBA literals** live only inside **`:root { … }`** in **`globals.css`**. **oklch** may return later — each migration updates this doc + ADR note.

Adding a saturated **marketing accent hue** (outside the Manus foundation trio) changes brand posture — defer to **ADR** + update §5 tables.

### 5.4 Status pigments (utilities / badges)

Status successes may use **explicit emerald Tailwind accents** (**`Badge` success variant**) because domain semantics (**success**) decouple from neutrals baseline.

Errors lean on **`--destructive`** path + badge destructive variant parity.

Reserve **warning amber** sparingly (**`Badge` variant `warning`** already exists**) for degraded-but-not-terminal states.

### 5.5 Raw values location

Authoritative palette literals (**HEX / RGBA today**) exist only in **`packages/ui/src/globals.css`** inside **`:root`**. Do not fork shadow theme files.

### 5.6 Dark mode placeholder

Until dual palettes are finalized, **no `:root.dark { ... }` token block ships in Phase 1**.

Do not rely on `prefers-color-scheme` alone in production paths without an ADR — keep experiments on branches.

## 6. Imagery / illustration

Prefer simple vector glyphs (**lucide-react**) tinted via tokens rather than saturated raster hero art cluttering cockpit density.

Future marketing pages may widen palette — still subject to **`AGENTS.md` layering**: presentation-only primitives live in **`@ash/ui`**.

## 7. Acceptance checklist (PR self-review)

Reviewer / author confirms:

| Check | PASS condition |
|-------|----------------|
| Palette drift absent | Zero new raw color literals violating §2 unless TODO justified |
| Token doc parity | Visible behavior shift touched §5 matrix OR linked ADR |
| Contrast heuristic | Sidebar + workspace captions remain legible (~WCAG-ish intent; tooling later) |

## 8. Related artifacts

| File | Responsibility |
|------|----------------|
| `packages/ui/src/globals.css` | Authoritative literals + `@theme` exports |
| `docs/adr/0005-*` | Decision record tying discipline + neutrality posture |
| `docs/components/agent-workbench-shell.md` | Motion + breakpoints interplay |

## Revision protocol

Structural visual philosophy changes require **`docs/visual-language-and-theme.md`** + **ADR** + commit message coherence (maintainer policy).
