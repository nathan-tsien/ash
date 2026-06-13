# ash Native Identity — "Ash & Ember"

Status: Approved for implementation (roadmap I3 deliverable; implemented in I4)
Decision record: `docs/adr/0014-ash-native-identity.md`
Supersedes: the Manus-bootstrap anchoring of PRIN-3 (guidelines v0.x)

## 1. Concept

The product is named after a material with its own color story. The identity leans into it:

- **Ash** — warm mineral neutrals: charcoal ink, ash-paper canvas, smoke darks.
  This is the workbench: composed, legible, monochrome.
- **Ember** — a single burnt-orange accent, the residual heat under the ash.
  Used so sparingly it stays memorable: brand mark and marketing moments only.

This keeps Phase 1's posture (PRIN-1/2/4 unchanged: structure over color, low noise)
while ending the borrowed Manus foundation. The workbench stays monochrome; the brand
gains one ownable signature hue and a marketing display voice.

## 2. Foundation trio (replaces Manus trio in PRIN-3)

| Role | Value | Name |
|------|-------|------|
| Ink | `#2A2825` | Charcoal — deeper, slightly smokier than the Manus `#34322D` |
| Canvas | `#F7F6F4` | Ash paper — one step warmer than the Manus `#F8F8F8` |
| Sheet | `#FFFFFF` | unchanged |

Derivation rules (how every other neutral is produced):

- All neutrals interpolate ink<->canvas/sheet on the same warm axis; no cold grays.
- Dark mode mirrors tonal relationships on a smoke series anchored at `#191817`.

## 3. Ember accent (new, strictly scoped)

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--ember` | `#B8441F` | `#E07B52` | Brand mark, marketing emphasis |
| `--ember-soft` | `#F8E8E0` | `#36211A` | Marketing washes behind ember text |

Scope (becomes rule COLOR-10):

- ALLOWED: marketing surfaces (hero kicker, section accents, wordmark dot), the brand
  mark anywhere it appears (e.g. sidebar wordmark dot), docs covers.
- FORBIDDEN: workbench functional chrome (buttons, links, focus, selection), status
  semantics (COLOR-3 owns those), destructive semantics (COLOR-4).
- Contrast: `#B8441F` on white ~5.4:1 (AA text); on `--ember-soft` ~4.5:1 (AA).

PRIN-4 stands: in the product, color still means status or destruction — ember is brand,
not meaning, and is confined to surfaces where nothing is being operated.

## 4. Semantic palette (full re-derivation)

Light:

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--background` | `#f7f6f4` | | `--accent` | `#eae7e2` |
| `--foreground` | `#2a2825` | | `--accent-foreground` | `#2a2825` |
| `--card` / `--popover` | `#ffffff` | | `--destructive` | `#c53030` |
| `--card-foreground` / `--popover-foreground` | `#2a2825` | | `--border` / `--input` | `#e3e1dc` |
| `--primary` | `#2a2825` | | `--ring` | `rgba(42,40,37,0.55)` |
| `--primary-foreground` | `#ffffff` | | `--sidebar` | `#ffffff` |
| `--secondary` | `#eceae6` | | `--sidebar-foreground` | `#2a2825` |
| `--secondary-foreground` | `#2a2825` | | `--sidebar-border` | `#eae8e4` |
| `--muted` | `#f0eeea` | | `--sidebar-accent` | `#f2f0ec` |
| `--muted-foreground` | `#6e6a63` | | `--workspace` | `#faf9f7` |

Dark (smoke series):

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--background` | `#191817` | | `--accent` | `#2b2a27` |
| `--foreground` | `#efedea` | | `--accent-foreground` | `#efedea` |
| `--card` / `--popover` | `#232220` | | `--destructive` | `#e55050` |
| `--card-foreground` / `--popover-foreground` | `#efedea` | | `--border` / `--input` | `#343230` |
| `--primary` | `#efedea` | | `--ring` | `rgba(239,237,234,0.55)` |
| `--primary-foreground` | `#191817` | | `--sidebar` | `#1d1c1b` |
| `--secondary` | `#2b2a27` | | `--sidebar-foreground` | `#efedea` |
| `--secondary-foreground` | `#efedea` | | `--sidebar-border` | `#2b2a27` |
| `--muted` | `#232220` | | `--sidebar-accent` | `#2b2a27` |
| `--muted-foreground` | `#a39f99` | | `--workspace` | `#1f1e1c` |

Status tokens (COLOR-3) are functional, not brand — values unchanged.

Focus ring alpha rises 0.28 -> 0.55 in both themes: blended against canvas this measures
~3.2:1 (light) and ~3.4:1 (dark), passing WCAG 2.4.11 non-text 3:1 — **this closes D-8**
(I4 verifies with measured values in the commit message).

Contrast spot checks (light): `--foreground` on `--background` ~13:1; `--muted-foreground`
on `--background` ~5.0:1; ember on white ~5.4:1. Dark: `--muted-foreground` on
`--background` ~7:1.

## 5. Typography identity

| Role | Family | Change |
|------|--------|--------|
| UI body | DM Sans | KEPT — proven in dense rails; zero migration risk |
| CJK | Noto Sans SC | KEPT — chain unchanged |
| Mono | Geist Mono | KEPT |
| **Display (new)** | **Bricolage Grotesque** | Marketing headlines (h1/h2), wordmark; `--font-display` via `next/font/google` |

Rationale: identity lives where type is large. Dense workbench type stays optimized for
legibility (TYPE-2 scale untouched); marketing gains a characterful grotesque that reads
"workshop, not chatbot". Display face never appears inside workbench panes (becomes TYPE-6).

## 6. Signature elements (PRIN-6 registry after this change)

| Signature | Posture |
|-----------|---------|
| Grain texture overlay | KEEP — cultivate on marketing |
| Ink monochrome CTA | KEEP — no colored primary buttons, ember does not touch buttons |
| Warm neutral palette | KEEP — values now ash-own (charcoal/ash paper) |
| Ember mark (new) | wordmark dot + marketing accents, scope per COLOR-10 |
| Display voice (new) | Bricolage Grotesque marketing headlines, scope per TYPE-6 |

## 7. Wordmark

The "ash" wordmark gains an ember full stop: **ash.** — lowercase DM Sans bold (UI chrome)
or Bricolage Grotesque (marketing), with the period in `--ember`. Implemented as styled
text, no logo asset this phase. Applied: marketing header/footer brand, sidebar brand row,
auth pages.

## 8. Guidelines impact (v1.0.0, MAJOR)

- PRIN-3 rewritten: ash-native foundation, Manus clause retired to a provenance note.
- PRIN-6 registry updated per §6.
- COLOR-10 added (ember scope). Appendix C regenerated with §4 + ember rows.
- TYPE-1 adds display row; TYPE-6 added (display face marketing-only).
- D-8 closed by ring change. ADR-0014 records the decision; ADR-0005/0013 remain history.
- `globals.css` header comment rewritten (no Manus references outside provenance line).

## 9. Out of scope

- No logo/raster asset production; wordmark is styled text.
- No accent customization or theming beyond light/dark.
- No workbench layout/motion changes (IA/MOTION rules untouched).
- Marketing copy unchanged; only visual identity moves.
