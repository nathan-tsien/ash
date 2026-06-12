# ADR-0013: Consolidated design guidelines as single normative authority

## Status

Accepted

## Context

Design guidance was split across `docs/visual-language-and-theme.md` (visual narrative), ADR-0005
(token discipline rules DT-1..DT-5), ADR-0004 (pane topology), ADR-0010 (dark mode), and
`docs/components/*.md` (pane contracts). The split caused drift: the visual doc retained a stale
"no dark palette ships in Phase 1" clause after ADR-0010 shipped dark mode; the shell doc cited a
360px Workspace width while code shipped 380px; status colors (`bg-blue-500`, `text-green-600`)
grew outside any documented rule.

A full design audit / redesign pass is planned. It needs one authoritative, rule-addressable,
versioned document to validate against.

## Decision

1. **`docs/design-guidelines.md` becomes the single normative design authority.** Every rule has a
   stable ID (`PRIN/COLOR/TYPE/SPACE/MOTION/IA/UX/IMPL/REV-n`) and an RFC 2119 strength
   (MUST/SHOULD/MAY). Reviews cite rule IDs; MUST violations block merge.
2. **`docs/visual-language-and-theme.md` is retired to a pointer stub.** Its content (including the
   token tables and dark palette) is absorbed into the guidelines.
3. **ADR-0005's narrative responsibility is superseded by this ADR.** Its rules map forward:
   DT-1 -> COLOR-1/2, DT-2 -> COLOR-6 (already superseded by ADR-0010), DT-3 -> COLOR-5,
   DT-4 -> Appendix C primary tokens, DT-5 -> COLOR-3 (status hues now route through dedicated
   status tokens rather than badge-variant escapes).
4. **The guidelines extend the system** where practice outgrew the spec: status color tokens
   (`--status-running/success/warning`), a named interface type scale (caption/label/body-sm/
   body/body-lg), canonical pane-width constants (Workspace fixed at the as-built 380px), and a
   named motion duration/easing scale.
5. **Known violations are registered, not blessed.** Appendix A of the guidelines carries the
   deviation register seeded by the 2026-06-13 implementation survey; remediation happens in the
   audit phase, doc-only in this change.
6. **The guidelines are versioned (semver) with a revision protocol** (Appendix B), so the document
   itself can be iterated deliberately before and during the audit.

## Consequences

- **Easier:** audits and reviews cite stable rule IDs; one file to read before designing; drift
  between narrative docs eliminated by construction.
- **Harder:** every token/scale change now requires touching the guidelines (version bump +
  changelog) in the same PR — intentional friction, same spirit as ADR-0005.
- **Deferred:** actual remediation of registered deviations (status tokens, type scale tokens,
  pane-width constants, `<details>` menu, responsive IA) — each lands in the audit phase under
  REV-3.
- **Supersession:** ADR-0005 gains a "Superseded by ADR-0013 (narrative authority relocated)"
  note; ADR-0004 and ADR-0010 remain in force and are referenced by IA-1 and COLOR-6.
