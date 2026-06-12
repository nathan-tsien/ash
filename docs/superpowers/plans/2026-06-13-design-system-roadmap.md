# ash Design System Roadmap — from Manus bootstrap to native system

> Program-level tracking document. Each iteration ships independently and gets its own
> detailed implementation plan before execution (linked below as plans land).
> Authority: `docs/design-guidelines.md` (rules cited by ID). Update the status table here
> at every iteration boundary.

**Goal:** Evolve the Phase 1 Manus-bootstrap visual system into ash's own design system,
remediate all registered deviations, and pass a full REV-3 audit.

**Tracking discipline:**

- Iteration status: `planned | in-progress | done(commit/PR)`.
- An iteration is `done` only when its exit gate passes and the guidelines deviation
  register (Appendix A) is refreshed.
- Guideline version bumps follow Appendix B semver.

## Status table

| Iteration | Scope | Guideline version | Plan | Status |
|-----------|-------|-------------------|------|--------|
| I1 | Guidelines v0.2.0 amendments + token infrastructure | v0.1.0 -> v0.2.0 | [2026-06-13-iteration-1-guidelines-v0.2-and-tokens.md](./2026-06-13-iteration-1-guidelines-v0.2-and-tokens.md) | planned |
| I2 | Deviation remediation sweep (components) | v0.2.0 (register updates only) | written at I2 start | planned |
| I3 | ash-native identity design (own design system) | v0.2.x -> v1.0.0 (MAJOR) + ADR-0014 | written after identity spec approved | planned |
| I4 | Identity implementation + marketing refresh | v1.0.x | written after I3 spec | planned |
| I5 | Full REV-3 audit + register closure | v1.0.x | written at I5 start | planned |

## I1 — Guidelines v0.2.0 + token infrastructure

Fix the three P0 spec defects found in the 2026-06-13 design review, close the P1 system
gaps, add the P2 identity rules, and land the supporting tokens in `globals.css` so later
remediation has real targets.

In scope:

- MOTION-1 boundary rewrite (CSS transitions vs GSAP by complexity, not interactivity).
- COLOR-3 status token triplets (`base / soft / foreground` x running/success/warning).
- TYPE-2 full type scale (size/line-height/weight) + 12px CJK floor.
- New rules: PRIN-6 signature elements registry, UX-9 icon scale, UX-10 interaction
  states, UX-11 loading patterns; IA-3 z-index numbers; MOTION-2 exit durations;
  PRIN-3 Manus sunset clause; SPACE-3 dark-elevation note; COLOR-8 ring-contrast note.
- `globals.css`: 9 status tokens (light+dark), named type scale, pane width tokens;
  `apps/web/src/lib/layout-constants.ts` for GSAP-side pane constants.
- Register D-8 (focus ring contrast); bump guidelines to v0.2.0.

Exit gate: `pnpm lint && pnpm typecheck && pnpm build` green; guideline self-checks
(grep gates in the plan) pass; no component behavior changes in this iteration.

## I2 — Deviation remediation sweep

Migrate components onto the I1 tokens; close D-1a..D-1d, D-2, D-3, D-4, D-5, D-7.

In scope (per deviation):

- D-1a `task-section.tsx`: status dots -> `bg-status-running` / `bg-status-success`.
- D-1b `message-bubble.tsx`: copy success -> `text-status-success`.
- D-1c `plan-card.tsx`: check icon -> `text-status-success`.
- D-1d `badge.tsx`: success/warning variants -> status soft/foreground tokens.
- D-2: replace arbitrary `text-[11px]/[12px]/[13px]/[15px]` with `text-caption/label/body-sm/body-lg` across `apps/web`.
- D-3: pane widths -> `w-sidebar` / `w-rail` / `w-workspace` + `layout-constants.ts` in GSAP timelines.
- D-4: composer heights documented as named constants with rationale comment.
- D-5: marketing mobile menu `<details>` -> `DropdownMenu` primitive.
- D-7: fix stale 360px figure in `docs/components/agent-workbench-shell.md`.

Exit gate: repo-wide grep for raw status hues / arbitrary text sizes / magic pane widths
returns zero hits outside documented escapes; existing vitest suites pass; visual smoke
check of the three panes light+dark.

## I3 — ash-native identity design (the "own design system" decision)

Design phase, not code phase. Produces the identity spec that ends the Manus bootstrap
(PRIN-3 sunset). Runs through brainstorming -> spec -> ADR-0014 before any plan is written.

Decisions the spec must settle:

- Brand foundation: ash-native ink/canvas/sheet values (keep warm-neutral posture or
  diverge), replacing the Manus trio as the anchor of PRIN-3.
- Typography identity: keep DM Sans or adopt a distinctive pairing (display + body);
  CJK companion choice stays harmonized.
- Signature elements (PRIN-6): which to amplify (grain texture, ink monochrome CTA,
  warm neutrals) and where they appear in product vs marketing.
- Accent posture: stays monochrome, or admits one ash-owned accent hue (MAJOR change,
  ADR required by PRIN-3/COLOR rules).
- Naming: token names stay semantic (no `--manus-*` residue in comments/docs).

Deliverables: `docs/superpowers/specs/<date>-ash-identity-design.md`, ADR-0014,
guidelines bumped to v1.0.0 (MAJOR: brand-posture change).

## I4 — Identity implementation + marketing refresh

Implement the approved I3 spec: `globals.css` palette swap, font loading changes,
marketing pages restyled to express the identity, Appendix C regenerated, dark palette
re-derived, contrast matrix re-checked (COLOR-8).

Exit gate: I1 gates + visual regression review of all routes light+dark; zero stale
Manus-anchored literals outside ADR history.

## I5 — Full REV-3 audit

Walk every rule ID against the live codebase (workflow-assisted, multi-agent if opted
in). Refresh Appendix A: close remediated entries with commits, register new findings,
convert bad-rule findings into Appendix B revision proposals (REV-4).

Exit gate: Appendix A has no `open` entries without an owner and target iteration;
audit report committed under `docs/superpowers/specs/`.

## Sequencing rationale

1. Rules before tokens before components: I1 fixes the rules so I2 migrations have
   stable targets — avoids re-migrating after rule churn.
2. Remediation before identity: I3's redesign lands on a clean, token-routed codebase;
   palette swaps then touch only `globals.css`, not scattered literals. This is the
   payoff of COLOR-1/2 discipline.
3. Audit last: REV-3 verifies the end state, not an intermediate one.
