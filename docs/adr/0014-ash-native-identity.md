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

## Amendment (2026-06): Neutral Stone ramp

**Context.** The original "Ash & Ember" launch derived the workbench neutral ramp on a
warm-beige axis (ink `#2A2825`, canvas `#F7F6F4`). A design review pass identified that
the warm undertone, while ownable, read slightly soft against the 2026 landscape of
competing agent products — which have moved toward colder, higher-contrast neutrals.

**Decision.** Retune the workbench neutral ramp from warm-beige to near-neutral stone,
deepening the ink and pulling most of the warmth out of the canvas:

- ink: `#2A2825` → `#1C1C1A` (deeper; nearly achromatic with a hair of warmth)
- canvas: `#F7F6F4` → `#F5F5F4` (stone; one step toward neutral)
- All 16 derived light/dark token pairs regenerated on the new axis; all contrast pairs
  pass WCAG AA (verified before merge).

This is a **ramp retune, not a brand-posture change**: no new saturated hue is introduced,
the ember accent (`--ember` / `--ember-soft`) and all status hues are unchanged, the
"Ash & Ember" name and identity posture remain in force. PRIN-3's trigger clause ("any
further saturated hue") is not activated.

**Rationale.** A near-neutral stone reads more modern and premium without abandoning the
mineral warmth that differentiates ash from cold-gray competitors. Ink deepened to
`#1C1C1A` raises foreground contrast and makes the workbench feel crisper at small type
sizes (TYPE-2 body/body-sm at 14–15px).

**Unchanged:** ember + status hues, motion system, type scale, three-pane IA. Guidelines
bumped to **v2.0.0** (MAJOR: foundation token values moved).

## Amendment (2026-07): Companion Shadow LogoMark

**Context.** The original Ash & Ember identity deliberately shipped only a styled-text
`ash.` wordmark. That kept the Phase 1 surface disciplined, but it left Ash without a
memorable icon for collapsed rails, loading states, future app icons, and social recall.
Stakeholder review clarified the three-layer product story: Cogito thinks, Praxis
operationalizes, and Ash is the human-facing personal secretary for work and life.

**Decision.** Add a vector `LogoMark` based on the **Companion Shadow + Task Core**
direction from `docs/superpowers/specs/2026-07-04-ash-logo-direction-design.md`. The mark
combines a charcoal companion silhouette, a white task-core negative space, and one small
ember point. It is additive to the `ash.` wordmark, not a replacement. Static favicon and
app icon exports are generated from the mark geometry and canonical light tokens, keeping
asset color literals traceable to `packages/ui/src/globals.css`.
Initial product placements include the workbench sidebar home mark, create-task home
composer, assistant message identity row, and marketing/auth brand lockups so the icon is
not isolated to one shell surface.

**Constraints.** The mark remains vector-only, token-colored, and brand-scoped. It must not
use a hand, face, mascot, eye, shield, house, generic AI sparkle, or letter-A dependency.
Ember remains limited to brand expression per COLOR-10.

**Unchanged:** Ash & Ember palette, Neutral Stone ramp, workbench chrome discipline,
three-pane IA, display-type scope, and existing wordmark semantics.
