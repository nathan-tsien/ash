# REV-3 Full Design Audit Report — 2026-06-13

Audited at: branch `i1-visual-refactor`, HEAD `054a4b3` (pre-remediation); remediation
commits `0af0130` (batch A), `0fa49ed` (batch B); rule amendments in guidelines v1.1.0.
Method: four parallel auditors, one per rule-family segment, walking every rule ID in
`docs/design-guidelines.md` against the live codebase.

## Headline

52 rules walked. At audit time: 37 compliant, 11 in violation, 4 not-verifiable
(process rules / surfaces that do not exist yet in Phase 1 mocks). After remediation
and v1.1.0 amendments: every violation is either fixed in code, codified as the
intentional convention (REV-4), or registered in Appendix A with an owner.

## Findings fixed in code (batches A + B)

| Finding | Rule | Fix |
|---------|------|-----|
| `transition-all` on Button fought every GSAP button tween | MOTION-1 | scoped transition property list (`0af0130`) |
| `hover:bg-white` raw literal in pill variant (dark-mode bug) | COLOR-2/IMPL-5 | `hover:bg-card` |
| `bg-black/40,50` scrims | COLOR-1/2 | new `--overlay` token, both themes |
| Reduced-motion was a no-op (explicit durations override `gsap.defaults`); marketing GSAP had zero coverage | MOTION-4 | `globalTimeline.timeScale` mechanism + side-effect imports in all 6 animation components + Parallax ScrollTrigger guard |
| Meta+K dead on `/app` routes | IA-4 | binding moved into `CommandPaletteProvider` (+2 tests) |
| Workspace collapse left a 380px dead gutter (transform-only) | IA-2 | width tweens to 0 and back in both shells |
| Local overlays at `z-50` | IA-3 (D-9) | tooltip/dropdown/marketing header to `z-40` |
| Status dots: 3 drifted ad-hoc spans | UX-7/IMPL-7 | `StatusDot` primitive in `@ash/ui` + sr-only labels (a11y bonus: dots previously had no text alternative) |
| Missing empty states (plan card, project tasks card) | UX-1 | empty branches + catalog keys |
| Hardcoded "ok"/"err"/"···", "User" fallbacks | IMPL-3 | catalog keys (zh/en parity checked) |
| 5 icon-only buttons without Tooltip; Dialog close | UX-2 | Tooltips added; DialogContent `closeAriaLabel` reused |
| Appendix C missing 4 alias rows | COLOR-7 | rows added (+ `--overlay`) |
| `font-normal` missing on one 12px body site; `-ml-[2px]` undocumented; 4 dead keyframes | TYPE-2/SPACE-1/hygiene | fixed/commented/pruned |

## Findings codified as conventions (v1.1.0, REV-4)

The as-built motion system was internally consistent but contradicted rules written
aspirationally in v0.2.0. Per REV-4 these became amendments, not silent exceptions:

- MOTION-2 bands widened: base 200–300ms, slow 350–500ms; marketing scroll-triggered cap
  800ms; ambient loops exempt; Radix overlays MAY exit symmetrically.
- MOTION-3 codifies the dichotomy: workbench entrances `power2.out`, marketing `power3.out`;
  exit/loop vocabulary added.
- MOTION-1 carve-out for looping status keyframes (`animate-pulse`/`animate-spin`).
- SPACE-3 marketing shadow carve-out (hero mockup, emphasized pricing tier).
- UX-9 icon scale rewritten to the real system: 14/16/18/20 (+12 mono-chip, 24–28 hero) —
  closes D-10.
- TYPE-2: stock `text-sm`/`text-xs` equivalence note.
- IA-3: portaled-above-shell layer note.

## Registered, not fixed (open with owners)

| ID | What | Owner / target |
|----|------|----------------|
| D-6 | Responsive/mobile IA absent | post-v1 responsive charter (needs ADR) |
| D-11 | Command palette: hand-rolled overlay, no focus trap/return, no exit animation | post-v1 a11y pass (rebuild on Dialog) |
| D-12 | Runtime-generated zh copy in praxis reducer / fake client | Phase 2 transport/i18n pass |
| D-13 | `focus:outline-none` inputs without ring substitute | post-v1 a11y pass |

## Not verifiable in Phase 1

- UX-1 loading states / UX-11 skeletons: all data is static mocks; no async surface exists.
  Re-audit when Phase 2 transports land.
- UX-5 destructive confirmation: no destructive action exists yet.
- REV-2 PR checklist: lives in PR descriptions, outside the repo.

## Observations (no action required)

- ~85 `text-xs`/`text-sm` uses now explicitly sanctioned by TYPE-2 equivalence note.
- Several presentation-only leaves carry redundant `"use client"` under client parents
  (IMPL-2 cleanup candidate, not a violation).
- `--ember-soft` and `w-rail` are defined but unconsumed (reserved).

## Verdict

Exit gate met: every Appendix A entry is `closed(...)` or `open` with an owner and target.
The guidelines (v1.1.0), the token layer, and the live codebase are mutually consistent at
HEAD. The design system is now ash-native ("Ash & Ember", ADR-0014) end to end.
