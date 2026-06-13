# Iteration 1: Guidelines v0.2.0 + Token Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amend `docs/design-guidelines.md` to v0.2.0 (P0 spec-defect fixes + P1 gap rules + P2 identity rules from the 2026-06-13 design review) and land the supporting tokens in `packages/ui/src/globals.css` so Iteration 2 component remediation has stable targets.

**Architecture:** Doc-first: every rule change lands in the guidelines before its token lands in CSS, keeping COLOR-7 parity within each commit. No component files change in this iteration — deviations D-1a..D-5 stay open until Iteration 2.

**Tech Stack:** Markdown (guidelines), Tailwind CSS v4 `@theme inline` tokens, TypeScript constants module.

**Verification model:** Doc tasks verify with `grep` gates; CSS/TS tasks verify with `pnpm lint && pnpm typecheck && pnpm build`. There is no vitest surface for tokens; the build is the test.

**Branch:** work on `docs/design-guidelines` (already exists, contains v0.1.0).

---

### Task 1: Rewrite MOTION-1 boundary and add exit-duration rule

**Files:**
- Modify: `docs/design-guidelines.md` (section 5, MOTION-1 and MOTION-2)

- [ ] **Step 1: Replace MOTION-1**

Replace the entire MOTION-1 paragraph (begins `**MOTION-1 (MUST)** GSAP is the canonical animation engine`) with:

```markdown
**MOTION-1 (MUST)** Animation engine is chosen by complexity, not by surface:

- CSS transitions: single-property, un-orchestrated state feedback — hover color/opacity,
  focus rings, simple reveals (`transition-colors`, `transition-opacity`).
- GSAP: spatial movement, multi-element orchestration, anything needing a timeline —
  pane collapse/expand, composer focus scaling, palette entrance, press bounces.
- CSS keyframes: ambient, non-interactive texture only (grain overlay), plus entrance
  keyframes consumed by GSAP utilities.

Never drive the same property of the same element with both a CSS transition and a GSAP
tween.
```

- [ ] **Step 2: Append exit-duration line to MOTION-2**

After the MOTION-2 sentence `Anything longer than 700ms is marketing-only and scroll-driven.`, append:

```markdown
Exits run at 50–70% of the corresponding entrance duration (as-built precedent: workspace
fade-out 100ms vs fade-in 350ms).
```

- [ ] **Step 3: Verify**

Run: `grep -c "chosen by complexity" docs/design-guidelines.md && grep -c "50–70% of the corresponding entrance" docs/design-guidelines.md`
Expected: `1` and `1`.

- [ ] **Step 4: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): MOTION-1 complexity boundary + MOTION-2 exit durations"
```

### Task 2: COLOR-3 status-token triplets and COLOR-8 ring-contrast note

**Files:**
- Modify: `docs/design-guidelines.md` (COLOR-3, COLOR-8, Appendix C)

- [ ] **Step 1: Replace the COLOR-3 token table and following paragraph**

Replace from the table header after `**COLOR-3 (MUST)**...` through `...re-route through these tokens at remediation time.` with:

```markdown
| Status | Tokens (each status defines all three) | Use |
|--------|----------------------------------------|-----|
| Running (in-flight) | `--status-running` / `--status-running-soft` / `--status-running-foreground` | solid dot+icon / badge wash / text on wash |
| Success (completed) | `--status-success` / `--status-success-soft` / `--status-success-foreground` | same pattern |
| Warning (degraded) | `--status-warning` / `--status-warning-soft` / `--status-warning-foreground` | same pattern |

`*-foreground` on `*-soft` MUST meet WCAG AA in both themes. Canonical literals live in
`globals.css` (Appendix C mirrors them). Raw Tailwind hues for status are forbidden;
`Badge` success/warning variants re-route through these tokens at D-1d remediation.
```

- [ ] **Step 2: Append to COLOR-8**

After the COLOR-8 sentence ending `tooling later).`, append:

```markdown
Focus ring contrast (`--ring` at 0.28 alpha) is unverified against WCAG 2.4.11 non-text
contrast (3:1) — tracked as D-8.
```

- [ ] **Step 3: Replace the three status rows in Appendix C**

Replace the three `TBD at D-1 remediation` rows with:

```markdown
| `--status-running` | `#3b82f6` | `#60a5fa` | In-flight dot/icon (COLOR-3) |
| `--status-running-soft` | `#eff6ff` | `#1c2940` | Running badge wash |
| `--status-running-foreground` | `#1d4ed8` | `#93c5fd` | Text on running wash |
| `--status-success` | `#10b981` | `#34d399` | Success dot/icon (COLOR-3) |
| `--status-success-soft` | `#ecfdf5` | `#122b22` | Success badge wash |
| `--status-success-foreground` | `#047857` | `#6ee7b7` | Text on success wash |
| `--status-warning` | `#f59e0b` | `#fbbf24` | Warning dot/icon (COLOR-3) |
| `--status-warning-soft` | `#fffbeb` | `#2e2510` | Warning badge wash |
| `--status-warning-foreground` | `#b45309` | `#fcd34d` | Text on warning wash |
```

- [ ] **Step 4: Verify**

Run: `grep -c "status-running-soft" docs/design-guidelines.md`
Expected: `3` or more (rule table + appendix). Also `grep -c "TBD at D-1" docs/design-guidelines.md` -> `0`.

- [ ] **Step 5: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): COLOR-3 status token triplets + COLOR-8 ring contrast note"
```

### Task 3: TYPE-2 full type scale + CJK floor

**Files:**
- Modify: `docs/design-guidelines.md` (TYPE-2)

- [ ] **Step 1: Replace the TYPE-2 table and trailing paragraph**

Replace the TYPE-2 table and the paragraph `Sizes above body-lg...` with:

```markdown
| Name | Size / line-height / weight | Use |
|------|-----------------------------|-----|
| `caption` | 11px / 16px / 400 | Timestamps, IDs — Latin/numeric content only |
| `label` | 12px / 16px / 500 | Chips, badges, rail labels |
| `body-sm` | 13px / 18px / 400 | Sidebar rows, workspace card text, nav items |
| `body` | 14px / 20px / 400 | Chat bubbles, default interface copy |
| `body-lg` | 15px / 22px / 400 | Chat pane headers, marketing body copy |

CJK floor: text that renders Han characters MUST be 12px or larger; `caption` is reserved
for pure Latin/numeric strings. The scale is deliberately compressed (11–15px) for
workbench density — hierarchy within it comes from weight and `--muted-foreground` color,
not from size jumps. Sizes above `body-lg` use the standard Tailwind heading scale
(`text-base` and up) and stay light-weight (PRIN-2).
```

- [ ] **Step 2: Verify**

Run: `grep -c "CJK floor" docs/design-guidelines.md`
Expected: `1`.

- [ ] **Step 3: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): TYPE-2 full scale (size/lh/weight) + 12px CJK floor"
```

### Task 4: PRIN-3 sunset clause + PRIN-6 signature elements registry

**Files:**
- Modify: `docs/design-guidelines.md` (section 1)

- [ ] **Step 1: Append sunset sentence to PRIN-3**

After the PRIN-3 sentence ending `...requiring an ADR and a revision of this document.`, append:

```markdown
The Manus anchoring is a Phase 1 bootstrap, not a destination: an ash-native identity
pass (own foundation trio, typography identity, accent posture) is expected before public
marketing, and lands as a MAJOR revision plus ADR (roadmap iteration I3).
```

- [ ] **Step 2: Insert PRIN-6 after PRIN-5**

```markdown
**PRIN-6 (SHOULD)** Signature elements registry. These existing elements carry ash's
visual identity and are protected: reviews check not only for rule violations but for
dilution of signatures.

| Signature | Where it lives | Posture |
|-----------|----------------|---------|
| Grain texture overlay | Marketing hero (`grain` keyframes) | Cultivate; MAY extend to other marketing surfaces |
| Ink monochrome CTA | `--primary` ink-on-white pill buttons | Protect; no colored primary buttons |
| Warm neutral palette | `#34322d`-family warm grays throughout | Protect; no cold-gray drift |

Adding or removing a signature is a MINOR revision; contradicting one in product code is
a SHOULD violation requiring written rationale.
```

- [ ] **Step 3: Verify**

Run: `grep -c "PRIN-6" docs/design-guidelines.md && grep -c "Phase 1 bootstrap, not a destination" docs/design-guidelines.md`
Expected: `1`+ and `1`.

- [ ] **Step 4: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): PRIN-3 Manus sunset clause + PRIN-6 signature registry"
```

### Task 5: IA-3 z-scale, SPACE-3 dark elevation, UX-9/10/11

**Files:**
- Modify: `docs/design-guidelines.md` (IA-3, SPACE-3, section 7)

- [ ] **Step 1: Extend IA-3 with the numeric scale**

After the IA-3 sentence ending `...(command palette, dialogs, future drawers).`, append:

```markdown
Numeric scale: shell tint `z-0`, pane scrollports `z-10`, local overlays `z-40`, global
shells `z-50`. No other z-index values in application code.
```

- [ ] **Step 2: Extend SPACE-3 with the dark-mode note**

After the SPACE-3 sentence ending `(color-blind readability).`, append:

```markdown
In dark mode, borders carry more of the elevation load (shadows read poorly on dark
canvas); surface lightening (`--card` one step above `--background`) is the secondary
cue — do not add shadows to compensate.
```

- [ ] **Step 3: Append UX-9, UX-10, UX-11 after UX-8**

```markdown
**UX-9 (MUST)** Icon scale: 16px (dense rails, inline), 18px (default chrome), 20px
(headers, emphasis). lucide `strokeWidth` stays at the default 2. No other icon sizes
without a SPACE-1-style justification comment.

**UX-10 (MUST)** Interaction state matrix for interactive rows/controls:

| State | Treatment |
|-------|-----------|
| Hover | `--accent` wash (`--sidebar-accent` inside Sidebar) |
| Active/pressed | GSAP press feedback (MOTION-3) or one wash step deeper; never color-only |
| Selected | Persistent `--accent` wash + `--foreground` text (vs `--muted-foreground` resting) |
| Disabled | `opacity-50` + `pointer-events-none`/`disabled` attr; no bespoke gray repaints |

**UX-11 (MUST)** Loading patterns: content surfaces (lists, cards, panes) use skeletons
(`bg-muted` blocks + `pulse-subtle`); in-button waits use an inline spinner replacing the
label or icon. Full-page spinners are forbidden.
```

- [ ] **Step 4: Verify**

Run: `grep -c "UX-11" docs/design-guidelines.md && grep -c "Numeric scale: shell tint" docs/design-guidelines.md`
Expected: `1`+ and `1`.

- [ ] **Step 5: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): IA-3 z-scale, SPACE-3 dark elevation, UX-9/10/11"
```

### Task 6: Register D-8, bump version to v0.2.0

**Files:**
- Modify: `docs/design-guidelines.md` (section 0, Appendix A, Appendix B)

- [ ] **Step 1: Add D-8 row to Appendix A (after D-7)**

```markdown
| D-8 | COLOR-8 | `globals.css` (`--ring`) | Focus ring contrast unverified vs WCAG 2.4.11 (3:1 non-text); needs measurement and possible alpha bump | open |
```

- [ ] **Step 2: Bump version in section 0**

Change `| Version | v0.1.0 |` to `| Version | v0.2.0 |`.

- [ ] **Step 3: Append changelog row in Appendix B**

```markdown
| v0.2.0 | 2026-06-13 | Design-review amendments: MOTION-1 complexity boundary, MOTION-2 exit durations, COLOR-3 token triplets, TYPE-2 full scale + CJK floor, PRIN-3 sunset clause, PRIN-6 signature registry, IA-3 z-scale, SPACE-3 dark elevation, UX-9/10/11, D-8 registered |
```

- [ ] **Step 4: Verify**

Run: `grep -c "| Version | v0.2.0 |" docs/design-guidelines.md && grep -c "D-8" docs/design-guidelines.md`
Expected: `1` and `2`+ (COLOR-8 note + register row + changelog).

- [ ] **Step 5: Commit**

```bash
git add docs/design-guidelines.md
git commit -m "docs(guidelines): bump to v0.2.0, register D-8"
```

### Task 7: Status tokens in globals.css

**Files:**
- Modify: `packages/ui/src/globals.css` (`@theme inline`, `:root`, `:root.dark`)

- [ ] **Step 1: Add aliases inside `@theme inline` (after `--color-workspace` line)**

```css
  --color-status-running: var(--status-running);
  --color-status-running-soft: var(--status-running-soft);
  --color-status-running-foreground: var(--status-running-foreground);
  --color-status-success: var(--status-success);
  --color-status-success-soft: var(--status-success-soft);
  --color-status-success-foreground: var(--status-success-foreground);
  --color-status-warning: var(--status-warning);
  --color-status-warning-soft: var(--status-warning-soft);
  --color-status-warning-foreground: var(--status-warning-foreground);
```

- [ ] **Step 2: Add literals to `:root` (after `--workspace: #fafafa;`)**

```css
  /* Status pigments (COLOR-3): base / soft wash / text-on-wash */
  --status-running: #3b82f6;
  --status-running-soft: #eff6ff;
  --status-running-foreground: #1d4ed8;
  --status-success: #10b981;
  --status-success-soft: #ecfdf5;
  --status-success-foreground: #047857;
  --status-warning: #f59e0b;
  --status-warning-soft: #fffbeb;
  --status-warning-foreground: #b45309;
```

- [ ] **Step 3: Add literals to `:root.dark` (after `--workspace: #201f1e;`)**

```css
  --status-running: #60a5fa;
  --status-running-soft: #1c2940;
  --status-running-foreground: #93c5fd;
  --status-success: #34d399;
  --status-success-soft: #122b22;
  --status-success-foreground: #6ee7b7;
  --status-warning: #fbbf24;
  --status-warning-soft: #2e2510;
  --status-warning-foreground: #fcd34d;
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: exit 0, no Tailwind/CSS errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/globals.css
git commit -m "feat(ui): status token triplets light+dark (COLOR-3, D-1)"
```

### Task 8: Type scale + pane geometry tokens

**Files:**
- Modify: `packages/ui/src/globals.css` (`@theme inline`)
- Create: `apps/web/src/lib/layout-constants.ts`

- [ ] **Step 1: Add type scale + pane spacing to `@theme inline` (after the radius lines)**

```css
  /* Named interface type scale (TYPE-2): size + line-height pairs */
  --text-caption: 0.6875rem;
  --text-caption--line-height: 1rem;
  --text-label: 0.75rem;
  --text-label--line-height: 1rem;
  --text-body-sm: 0.8125rem;
  --text-body-sm--line-height: 1.125rem;
  --text-body: 0.875rem;
  --text-body--line-height: 1.25rem;
  --text-body-lg: 0.9375rem;
  --text-body-lg--line-height: 1.375rem;
  /* Pane geometry (SPACE-4): enables w-sidebar / w-rail / w-workspace */
  --spacing-sidebar: 260px;
  --spacing-rail: 56px;
  --spacing-workspace: 380px;
```

- [ ] **Step 2: Create `apps/web/src/lib/layout-constants.ts`**

```ts
/**
 * Pane geometry constants (design-guidelines SPACE-4).
 * GSAP timelines animate raw pixel widths and cannot read Tailwind utilities,
 * so these mirror the --spacing-sidebar/rail/workspace tokens in
 * packages/ui/src/globals.css. Change both places together (REV-2 geometry check).
 */
export const PANE_WIDTH = {
  sidebar: 260,
  rail: 56,
  workspace: 380,
} as const;
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: exit 0. Then sanity-check a utility resolves: `grep -c "spacing-workspace" packages/ui/src/globals.css` -> `1`.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/globals.css apps/web/src/lib/layout-constants.ts
git commit -m "feat(ui): named type scale + pane geometry tokens (TYPE-2, SPACE-4)"
```

### Task 9: Iteration exit gate

**Files:**
- Modify: `docs/superpowers/plans/2026-06-13-design-system-roadmap.md` (status table)

- [ ] **Step 1: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: all exit 0.

- [ ] **Step 2: Confirm no component drift**

Run: `git diff main --stat -- apps/web/src/components packages/ui/src/components`
Expected: empty (this iteration touches only guidelines, globals.css, lib constants).

- [ ] **Step 3: Mark I1 done in the roadmap status table**

Change the I1 row status from `planned` to `done(<merge commit>)` after merge.

- [ ] **Step 4: Commit and open PR**

```bash
git add docs/superpowers/plans/2026-06-13-design-system-roadmap.md
git commit -m "docs(roadmap): mark I1 done"
git push -u origin docs/design-guidelines
gh pr create --title "docs+tokens: design guidelines v0.2.0 + status/type/geometry tokens (I1)" --body "Roadmap iteration I1. Guidelines v0.1.0->v0.2.0 amendments from design review; status token triplets, named type scale, pane geometry tokens. No component changes; D-1a..D-7 remediate in I2."
```
