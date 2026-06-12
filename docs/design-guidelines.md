# ash Design Guidelines

Single normative authority for UI/UX design and frontend implementation in ash.
Supersedes the narrative role of `docs/visual-language-and-theme.md` (now a pointer stub).
Decision record: `docs/adr/0013-consolidated-design-guidelines.md`.

## 0. Status and version

| Field | Value |
|-------|-------|
| Version | v0.1.0 |
| Status | Active |
| Changelog | Appendix B |

How to read this document:

- Every normative statement carries a stable rule ID (`PRIN-1`, `COLOR-3`, ...) and a
  strength keyword per RFC 2119: **MUST** (review blocker), **SHOULD** (deviation requires a
  written rationale in the PR), **MAY** (explicitly permitted).
- Rule IDs are stable across revisions. Retired rules keep their ID with a `(retired vX.Y.Z)` mark;
  IDs are never reused.
- Reviews cite rules by ID (for example "violates COLOR-3"). Appendix A tracks known,
  not-yet-remediated violations.
- Changing any rule follows the revision protocol in Appendix B.

Related decision records: ADR-0003 (stack), ADR-0004 (three-pane IA), ADR-0005 (token
discipline, narrative superseded by this document), ADR-0010 (dark mode), ADR-0013 (this
consolidation).

## 1. Design principles (PRIN)

These principles are the tiebreakers for every design decision not covered by a concrete rule.

**PRIN-1 (MUST)** ash is an agent workbench — tasks, audits, artifacts — not a novelty chat skin.
Surfaces present work, provenance, and control; decoration that does not serve those reads is noise.

**PRIN-2 (MUST)** Emotional tone is composed, highly legible, low visual noise. When in doubt,
remove an element rather than add one.

**PRIN-3 (MUST)** The visual identity is Manus-aligned: a minimal neutral system anchored on the
Manus brand foundation (`#34322D` ink, `#F8F8F8` canvas, `#FFFFFF` sheets) plus derived neutrals.
Phase 1 admits no saturated marketing hue; introducing one is a brand-posture change requiring an ADR
and a revision of this document.

**PRIN-4 (MUST)** Hierarchy comes from structure (borders, spacing, typography weight), not from
color or shadow. Color carries meaning only for status and destructive intent.

**PRIN-5 (SHOULD)** Decision test for new design questions, in order:
1. Does an existing rule answer it? Follow the rule.
2. Does a precedent exist in the workbench? Match the precedent.
3. Does the simpler of the candidate options survive PRIN-1/PRIN-2? Take it.
4. Still ambiguous? File it as a proposed rule change (Appendix B), do not improvise silently.

## 2. Color and theming (COLOR)

**COLOR-1 (MUST)** All color literals (HEX/RGBA) live exclusively in
`packages/ui/src/globals.css` under `:root` (light) and `:root.dark` (dark), exported as semantic
Tailwind aliases via `@theme inline`. No other file defines brand or UI colors.

**COLOR-2 (MUST)** Application code (`apps/web`, `packages/ui` components) consumes semantic
tokens only: `bg-background`, `text-foreground`, `border-border`, `ring-ring`, `bg-sidebar`,
`bg-workspace`, etc. Raw palette utilities (`bg-blue-500`, `text-green-600`, hex strings) are
forbidden. One-off escapes (embedded third-party iframes, syntax-highlighter internals) MUST carry
an English `TODO(ash-visual): rationale` comment beside the deviation.

**COLOR-3 (MUST)** Status semantics route through dedicated status tokens, not raw Tailwind hues:

| Status | Tokens (each status defines all three) | Use |
|--------|----------------------------------------|-----|
| Running (in-flight) | `--status-running` / `--status-running-soft` / `--status-running-foreground` | solid dot+icon / badge wash / text on wash |
| Success (completed) | `--status-success` / `--status-success-soft` / `--status-success-foreground` | same pattern |
| Warning (degraded) | `--status-warning` / `--status-warning-soft` / `--status-warning-foreground` | same pattern |

`*-foreground` on `*-soft` MUST meet WCAG AA in both themes. Canonical literals live in
`globals.css` (Appendix C mirrors them). Raw Tailwind hues for status are forbidden;
`Badge` success/warning variants re-route through these tokens at D-1d remediation.

**COLOR-4 (MUST)** Destructive and error semantics use `--destructive` (and badge destructive
variant) exclusively. Functional red appears nowhere else.

**COLOR-5 (MUST)** Workbench geography keeps dedicated chrome tokens: `--sidebar*` for the left
rail, `--workspace` for the right rail, distinct from `--background`/`--card`. Panes never borrow
each other's surface tokens.

**COLOR-6 (MUST)** Dark mode is the inverted-neutral palette of ADR-0010, applied via the `.dark`
class on `<html>`, managed by `ThemeProvider` (`@ash/ui`), persisted in `localStorage("ash-theme")`
with `light | dark | system`. Every new token MUST define both light and dark values in the same
change.

**COLOR-7 (MUST)** Any semantic alias addition, removal, or remapping updates the token reference
(Appendix C) in the same PR, and bumps this document's version per Appendix B.

**COLOR-8 (SHOULD)** Maintain readable contrast on tinted chrome: sidebar and workspace captions
rest on their `*-foreground` tokens; never gray-on-gray without checking legibility (WCAG AA
intent; tooling later).

Focus ring contrast (`--ring` at 0.28 alpha) is unverified against WCAG 2.4.11 non-text
contrast (3:1) — tracked as D-8.

**COLOR-9 (MAY)** `--muted`/`bg-muted` washes for inset tracks and sparse zebra striping;
`--accent` for row hover washes.

Canonical palette values: see Appendix C and `packages/ui/src/globals.css`.

## 3. Typography (TYPE)

**TYPE-1 (MUST)** Font stack, loaded via `next/font/google` in `apps/web` `layout.tsx` and chained
in `globals.css`:

| Role | Family | CSS variable |
|------|--------|--------------|
| UI sans | DM Sans | `--font-dm-sans` -> `--font-sans` |
| CJK fallback | Noto Sans SC | `--font-noto-sc` |
| Monospace | Geist Mono | `--font-geist-mono` -> `--font-mono` |

**TYPE-2 (MUST)** Interface type uses the named scale below. Arbitrary pixel values
(`text-[13px]` etc.) are forbidden once the scale tokens land (Appendix A, D-2):

| Name | Size | Use |
|------|------|-----|
| `caption` | 11px | Timestamps, tertiary metadata in dense rails |
| `label` | 12px | Chips, badges, rail labels |
| `body-sm` | 13px | Sidebar rows, workspace card text, nav items |
| `body` | 14px (`text-sm`) | Chat bubbles, default interface copy |
| `body-lg` | 15px | Chat pane headers, marketing body copy |

Sizes above `body-lg` use the standard Tailwind heading scale (`text-base` and up) and stay
light-weight (PRIN-2).

**TYPE-3 (MUST)** Chat reading measure stays a narrow central column (about `max-w-3xl`).

**TYPE-4 (SHOULD)** Mixed zh-CN UI copy with Latin tool/product names is expected; err toward
`leading-relaxed` line heights for mixed-script runs.

**TYPE-5 (SHOULD)** Monospace is reserved for code, IDs, and mono chips — not for emphasis.

## 4. Space, shape, elevation (SPACE)

**SPACE-1 (MUST)** Spacing rhythm is a 4px base. Favor `gap-2`, `p-3`, `p-4`; off-grid arbitrary
spacing values require a comment justifying them.

**SPACE-2 (MUST)** Corner radius derives from `--radius: 0.75rem` (12px): panels and cards use
`rounded-xl`/`rounded-2xl`, buttons are `rounded-full` pills. No arbitrary radius values.

**SPACE-3 (MUST)** Elevation is borders-first: hairline `border-border` (and `border-sidebar-border`)
separates surfaces. Shadows (`shadow-xs`/`shadow-sm`) appear only where affordance parity demands
lift (primary pill CTA, floating overlays). Never rely on opacity-only separation between panes
(color-blind readability).

**SPACE-4 (MUST)** Pane geometry constants:

| Constant | Value | Notes |
|----------|-------|-------|
| Sidebar expanded | 260px | |
| Sidebar rail (collapsed) | 56px | |
| Workspace | 380px | Canonical as-built value; the former 360px figure in shell docs is obsolete |
| Workspace collapsed | 0 | Floating toggle / FAB re-opens |

These values live as named constants (single definition point) once D-3 in Appendix A is remediated;
until then, the table above is the authority.

**SPACE-5 (SHOULD)** Dividers prefer `<Separator>` plus border tokens over filler gray blocks.

## 5. Motion (MOTION)

**MOTION-1 (MUST)** Animation engine is chosen by complexity, not by surface:

- CSS transitions: single-property, un-orchestrated state feedback — hover color/opacity,
  focus rings, simple reveals (`transition-colors`, `transition-opacity`).
- GSAP: spatial movement, multi-element orchestration, anything needing a timeline —
  pane collapse/expand, composer focus scaling, palette entrance, press bounces.
- CSS keyframes: ambient, non-interactive texture only (grain overlay), plus entrance
  keyframes consumed by GSAP utilities.

Never drive the same property of the same element with both a CSS transition and a GSAP
tween.

**MOTION-2 (MUST)** Duration scale:

| Name | Duration | Use |
|------|----------|-----|
| `fast` | 100–150ms | Micro-interactions: press, copy bounce, hover affordances |
| `base` | 200–260ms | Pane collapse/expand, overlay entrance, focus scaling |
| `slow` | 350–450ms | Pane re-expansion, marketing entrances |

Anything longer than 700ms is marketing-only and scroll-driven.

Exits run at 50–70% of the corresponding entrance duration (as-built precedent: workspace
fade-out 100ms vs fade-in 350ms).

**MOTION-3 (MUST)** Easing language: entrances decelerate with `power3.out`; hover/press
interactions use `power2.out`; playful press feedback MAY use `back.out`. Linear easing only for
scroll-scrubbed parallax.

**MOTION-4 (MUST)** All motion honors `prefers-reduced-motion`, via `gsap.matchMedia()` for GSAP
and the global reduced-motion CSS rule in `globals.css` for keyframes.

**MOTION-5 (SHOULD)** Shared animation utilities live in `apps/web/src/lib/animations/`; marketing
entrance components live in `apps/web/src/components/animations/`. New motion composes these before
inventing new timelines.

**MOTION-6 (SHOULD)** Motion communicates state change (open, send, complete); decorative motion in
the workbench panes is avoided (PRIN-2). Marketing pages MAY use richer entrances (HeroTimeline,
ScrollReveal, Parallax, TextSplit, StaggerGroup) within the duration scale.

## 6. Information architecture (IA)

**IA-1 (MUST)** The workbench is a fixed three-pane topology (ADR-0004): Sidebar (inventory,
search, new-task CTA, account) + Chat (conversation + composer) + Workspace (plan, tool traces,
artifacts). Relocating a pane's responsibilities requires a superseding ADR.

**IA-2 (MUST)** Allowed pane elasticity: Sidebar collapses to a 56px icon rail; Workspace
collapses to 0 with a floating re-open affordance. No fourth permanent rail; feature modules
register tabs/panels inside Workspace chrome.

**IA-3 (MUST)** Overlay layering order (bottom to top): shell tint, pane scrollports, local
overlays (popover/dropdown/tooltip), global shells (command palette, dialogs, future drawers).

**IA-4 (MUST)** Settings is a global modal (no dedicated route), triggered from the Sidebar
account footer. The command palette opens on `Meta+K` / `Ctrl+K`.

**IA-5 (MUST)** Composer keys: `Enter` sends, `Shift+Enter` inserts a newline.

**IA-6 (MUST)** Small-screen adaptation is deferred but bounded: the product MUST NOT silently
degrade to a single chat column. Responsive IA requires its own ADR before shipping.

**IA-7 (SHOULD)** Route map stays: `/` marketing/onboarding, `/c/[conversationId]` full
triple-pane (with `?demo=<caseId>` banner variant), app routes under `/[locale]/app/...`.
Query-driven focus swaps (for example `?focus=workspace`) stay unimplemented until a spec adopts them.

## 7. UX patterns (UX)

**UX-1 (MUST)** Every async surface designs all four states: empty, loading, populated, error.
Empty states explain the next action in zh-CN copy; errors lean on `--destructive` semantics and
say what to do next.

**UX-2 (MUST)** Icon-only controls expose `aria-label` plus a Tooltip with zh-CN copy.

**UX-3 (MUST)** Keyboard accessibility: visible focus outlines via shared `ring` tokens;
collapsed rails preserve focus order and expose `aria-expanded`; semantic landmarks (`nav`,
`main`, `aside` equivalents) frame the panes.

**UX-4 (MUST)** Modals and overlays use the vendored Radix primitives in `packages/ui`
(Dialog, DropdownMenu, Tooltip, ...). Native disclosure elements (`<details>`) are not used for
interactive menus (consistency + a11y parity). Existing exception registered in Appendix A (D-5).

**UX-5 (MUST)** Destructive actions require explicit confirmation and use destructive styling;
never a bare primary button.

**UX-6 (SHOULD)** Icons are lucide-react vector glyphs inheriting `currentColor`, tinted
`text-muted-foreground` or `text-foreground`. No saturated raster illustration inside the workbench.

**UX-7 (SHOULD)** Status display: running/success/warning dots and badges use COLOR-3 tokens via
the Badge variants or a shared status-dot primitive — not ad hoc colored divs.

**UX-8 (SHOULD)** Optimistic or streamed content (chat tokens, tool traces) appears with `message-in`
style entrance at `fast`/`base` durations; no layout jank on stream (reserve space before fill).

## 8. Implementation discipline (IMPL)

**IMPL-1 (MUST)** Respect the package layering: presentation-only primitives in `packages/ui`,
shapes/mocks in `packages/shared`, composition in `apps/web`. No cogito import graph into
browser-facing packages (AGENTS.md).

**IMPL-2 (MUST)** Server components are the default; escalate to `"use client"` narrowly
(gestures, virtualization, transports). Watch for client-boundary explosions in review.

**IMPL-3 (MUST)** All user-facing strings route through next-intl message catalogs
(`apps/web/messages/`), zh-CN baseline plus en. No hardcoded UI copy in components.

**IMPL-4 (MUST)** Comments and developer logs are English only. Docs prose is English; UI copy is
zh-CN baseline. No ornamental Unicode glyphs as list bullets.

**IMPL-5 (MUST)** Component variants use the cva pattern established in `packages/ui` (see
`button.tsx`); variant values reference semantic tokens only.

**IMPL-6 (MUST)** Each workbench pane change updates its contract doc in `docs/components/*.md`
in the same PR.

**IMPL-7 (SHOULD)** New shared visual primitives (status dot, named type scale helpers) land in
`packages/ui`, not copy-pasted across `apps/web` features.

## 9. Review protocol (REV)

**REV-1 (MUST)** Design review verdicts cite rule IDs. A MUST violation blocks merge unless the PR
adds the deviation to Appendix A with an owner and a rationale. A SHOULD violation needs a written
rationale in the PR description.

**REV-2 (MUST)** PR self-review checklist (author confirms in the PR):

| Check | PASS condition |
|-------|----------------|
| Palette drift | Zero new raw color literals (COLOR-1/2); no new raw status hues (COLOR-3) |
| Token parity | Token/alias changes update Appendix C + version bump (COLOR-7) |
| Type scale | No new arbitrary `text-[Npx]` values (TYPE-2) |
| Geometry | No new pane-width or spacing magic numbers (SPACE-1/4) |
| Motion | New animation uses the duration/easing scale + reduced-motion (MOTION-2/3/4) |
| States | New async surfaces cover empty/loading/error (UX-1) |
| a11y | Icon-only controls labeled; focus visible (UX-2/3) |
| i18n | No hardcoded UI strings (IMPL-3) |
| Docs | Pane contract docs updated (IMPL-6) |

**REV-3 (MUST)** A full design audit (the "validate or redesign" pass) walks every rule ID against
the live codebase, refreshing Appendix A: new violations get registered, remediated entries get
closed with the fixing commit.

**REV-4 (SHOULD)** Audit findings that reveal a bad rule (too strict, wrong, obsolete) become
revision proposals (Appendix B), not silent exceptions.

## Appendix A. Deviation register

Known violations awaiting remediation. Remediation order and ownership are decided in the audit
phase; this register is its input. Status: `open | in-progress | closed(commit)`.

| ID | Rule | Location | Deviation | Status |
|----|------|----------|-----------|--------|
| D-1 | COLOR-3 | `globals.css` | Status tokens (`--status-running/success/warning`) not yet defined; raw hues in use downstream (D-1a..D-1d) | open |
| D-1a | COLOR-2/3 | `apps/web/src/components/workbench/sidebar/task-section.tsx` (status dots) | `bg-blue-500` (running), `bg-emerald-500` (completed) | open |
| D-1b | COLOR-2/3 | `apps/web/src/components/workbench/chat/message-bubble.tsx` (copy success) | `text-green-600` | open |
| D-1c | COLOR-2/3 | `apps/web/src/components/workbench/workspace/plan-card.tsx` (check icon) | `text-emerald-600` | open |
| D-1d | COLOR-3 | `packages/ui/src/components/badge.tsx` | success/warning variants on raw `emerald-*`/`amber-*` utilities (legal under old DT-5; re-route to status tokens) | open |
| D-2 | TYPE-2 | widespread (`apps/web`) | Arbitrary `text-[11px]/[12px]/[13px]/[15px]` instead of named scale tokens (tokens not yet defined) | open |
| D-3 | SPACE-4 | `workbench-sidebar.tsx`, `workbench-workspace.tsx`, `workbench-chrome.tsx` | Pane widths as inline magic numbers (`w-[260px]`, `w-[380px]`, `style={{width:380}}`); shell doc still says 360px | open |
| D-4 | SPACE-1 | `apps/web/src/components/workbench/chat/composer.tsx` | `max-h-[168px] min-h-[72px]` magic heights, undocumented | open |
| D-5 | UX-4 | `apps/web/src/components/marketing/marketing-header.tsx` | Mobile menu uses native `<details>` instead of Radix primitives | open |
| D-6 | IA-6 | workbench shell | Responsive/mobile IA absent (known deferral; needs its own ADR before shipping small-screen) | open |
| D-7 | (doc) | `docs/components/agent-workbench-shell.md` | Stale 360px Workspace width figure (superseded by SPACE-4) | open |

## Appendix B. Revision protocol and changelog

This document is versioned `vMAJOR.MINOR.PATCH`:

- **PATCH**: wording, examples, deviation-register bookkeeping. No rule semantics change.
- **MINOR**: new rule, strength downgrade (MUST -> SHOULD), new token/scale entry.
- **MAJOR**: rule removal/reversal, strength upgrade (SHOULD -> MUST), brand-posture change
  (also requires an ADR), pane-topology change (requires superseding ADR per IA-1).

Procedure:

1. Propose the change as a PR editing this file (and `globals.css`/ADR when applicable).
2. The PR description states: rule IDs touched, old text, new text, motivation.
3. On merge: bump the version in section 0 and append a changelog line below.
4. Structural philosophy changes keep doc + ADR + commit message coherent (maintainer policy).

Changelog:

| Version | Date | Change |
|---------|------|--------|
| v0.1.0 | 2026-06-13 | Initial consolidation: absorbs `docs/visual-language-and-theme.md`, codifies rule IDs, status-token plan, named type scale, pane constants, motion scale, deviation register (ADR-0013) |

## Appendix C. Token reference snapshot

Authoritative literals live only in `packages/ui/src/globals.css` (`:root` and `:root.dark`).
This snapshot is a convenience matrix and MUST be regenerated when tokens change (COLOR-7).

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--background` | `#f8f8f8` | `#1a1918` | App canvas |
| `--foreground` | `#34322d` | `#f0efed` | Primary ink |
| `--card` | `#ffffff` | `#252423` | Raised panels, assistant bubbles |
| `--popover` | `#ffffff` | `#252423` | Floating sheets |
| `--primary` | `#34322d` | `#f0efed` | Solid CTA fill (ink-on-white inversion) |
| `--primary-foreground` | `#ffffff` | `#1a1918` | Text on primary |
| `--secondary` | `#ebeae8` | `#2a2928` | User bubble fill, ghost surfaces |
| `--muted` | `#f0efed` | `#252423` | Inset trays |
| `--muted-foreground` | `#706e69` | `#a09e9a` | Secondary labels, captions |
| `--accent` | `#eae9e7` | `#2a2928` | Row hover washes |
| `--destructive` | `#c53030` | `#e55050` | Destructive intent only |
| `--border` / `--input` | `#e4e4e1` | `#333230` | Hairlines, field chrome |
| `--ring` | `rgba(52,50,45,0.28)` | `rgba(240,239,237,0.28)` | Focus rings |
| `--sidebar` | `#ffffff` | `#1e1d1c` | Sidebar chrome |
| `--sidebar-foreground` | `#34322d` | `#f0efed` | Sidebar text |
| `--sidebar-border` | `#ecebe9` | `#2a2928` | Sidebar hairlines |
| `--sidebar-accent` | `#f4f3f2` | `#2a2928` | Sidebar row hover |
| `--workspace` | `#fafafa` | `#201f1e` | Right audit rail |
| `--radius` | `0.75rem` | same | Radius core (sm/md/lg/xl derived) |
| `--status-running` | `#3b82f6` | `#60a5fa` | In-flight dot/icon (COLOR-3) |
| `--status-running-soft` | `#eff6ff` | `#1c2940` | Running badge wash |
| `--status-running-foreground` | `#1d4ed8` | `#93c5fd` | Text on running wash |
| `--status-success` | `#10b981` | `#34d399` | Success dot/icon (COLOR-3) |
| `--status-success-soft` | `#ecfdf5` | `#122b22` | Success badge wash |
| `--status-success-foreground` | `#047857` | `#6ee7b7` | Text on success wash |
| `--status-warning` | `#f59e0b` | `#fbbf24` | Warning dot/icon (COLOR-3) |
| `--status-warning-soft` | `#fffbeb` | `#2e2510` | Warning badge wash |
| `--status-warning-foreground` | `#b45309` | `#fcd34d` | Text on warning wash |

Fonts: `--font-sans` = DM Sans -> Noto Sans SC -> system; `--font-mono` = Geist Mono -> system.
