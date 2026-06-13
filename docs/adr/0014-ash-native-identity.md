# ADR-0014: ash-native visual identity ("Ash & Ember")

## Status

Accepted

## Context

PRIN-3 (guidelines v0.x) anchored the palette on the public Manus brand trio as an explicit
Phase 1 bootstrap with a sunset clause: an ash-native identity pass was required before
public marketing. The bootstrap served its purpose — token discipline (COLOR-1/2) routed
every surface through `globals.css`, so an identity swap now touches one file plus docs.

Risks of staying: identity built on another company's brand colors; a neutral system
visually indistinguishable from the 2025-26 cohort of agent products (the design review
called this out: discipline prevents ugliness, not genericity).

## Decision

Adopt the "Ash & Ember" identity per `docs/superpowers/specs/2026-06-13-ash-identity-design.md`:

1. **Ash-native foundation trio**: charcoal ink `#2A2825`, ash-paper canvas `#F7F6F4`,
   white sheets — same warm-neutral posture, ash-owned values. Full light/dark palettes
   re-derived on this axis (spec §4).
2. **Ember accent** `--ember` / `--ember-soft`: the single brand hue, scoped by new rule
   COLOR-10 to marketing surfaces and the brand mark only. Workbench chrome stays
   monochrome; status/destructive semantics unchanged.
3. **Display typeface**: Bricolage Grotesque (`--font-display`) for marketing headlines
   and the wordmark; UI body stays DM Sans + Noto Sans SC + Geist Mono. New rule TYPE-6
   keeps the display face out of workbench panes.
4. **Wordmark**: styled-text "ash." with ember period (no logo asset this phase).
5. **Focus ring alpha 0.28 -> 0.55** both themes, meeting WCAG 2.4.11 3:1 — closes D-8.
6. Guidelines bump to **v1.0.0** (MAJOR: brand-posture change) with PRIN-3 rewritten,
   PRIN-6 registry extended, Appendix C regenerated.

## Consequences

- **Easier:** an ownable identity ash can market under; ember + display voice give
  reviews a positive target ("is the signature present?") not just violation checks.
- **Harder:** ember's narrow scope needs policing (COLOR-10 in every marketing review);
  one more font subset shipped on marketing routes.
- **Unchanged:** workbench composure (PRIN-1/2/4), three-pane IA, motion system, status
  tokens, type scale.
- **Supersession:** PRIN-3's Manus anchoring retired (provenance noted in guidelines);
  ADR-0005/ADR-0013 remain accurate history. ADR-0010's dark-mode decision carries over
  onto the smoke series.
