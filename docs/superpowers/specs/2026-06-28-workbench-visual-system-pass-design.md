# Workbench Visual/UX System Pass — Design Spec

- Status: Draft (awaiting user review)
- Date: 2026-06-28
- Author: brainstormed with Claude
- Sub-project: **C** of the workbench deep-overhaul decomposition (see "Context" below)
- Supersedes/relates: amends `docs/design-guidelines.md` (→ MAJOR rev) and `ADR-0014` (neutral ramp only)

## Context

The workbench deep-overhaul was decomposed into sub-projects:

| # | Sub-project | This spec? |
|---|---|---|
| A | Workspace reconception (process timeline + deliverables on real attachments) | No — deferred |
| B | Rich deliverable canvas (in-app viewers) | No — deferred |
| **C** | **Visual/UX system pass (this document)** | **Yes** |
| D | Backend contract (`task_outputs` / artifact emission, praxis/cogito upstream) | No — deferred |
| E | IA/topology (keep three-pane; ADR housekeeping) | No — deferred |

This spec is **C only**: a systematic, comprehensive refinement of the visual language across all three panes, staying within the existing identity (Direction "A · Polish" — no radical re-skin), plus a **neutral-ramp palette modernization** ("Neutral Stone"). It deliberately does **not** restructure the workspace's information architecture (that is sub-project A); it only polishes the visual vocabulary the workspace already uses so that vocabulary carries forward into A.

### Decisions locked during brainstorming (visual companion)

1. **Direction A · Polish** — refine within the "Ash & Ember" identity; no brand reinvention. "Deep" = comprehensive + consistent, not radical.
2. **Polish degree** confirmed on the chat pane; specifically the **ink-dark right-aligned user bubble**, role labels, and divider-based turn rhythm were approved.
3. **Shell language** (sidebar rows + status dots + ink active rail; workspace plan checklist / tool timeline / deliverable cards) approved.
4. **Palette** = **Neutral Stone**: pull the warmth almost out of the workbench neutral ramp, deepen the ink for crisper contrast; keep it restrained ("不花哨") — no decorative saturated accents, status hues stay reserved for meaning. Keep the "Ash & Ember" name and the ember accent (marketing-scoped, unchanged).

## Goals

1. Make the workbench read as **modern and premium ("高级"), not flashy** — achieved through neutral-ramp retuning, crisper contrast, refined spacing/typography rhythm, and consistent component treatment.
2. Establish a **single, consistent component vocabulary** (rows, status dots, status chips, cards, tool timeline, deliverable cards, composer) reused across panes.
3. Keep all changes **token-governed** (COLOR-1/2): every literal lives in `packages/ui/src/globals.css`, both light and dark (COLOR-6); application code consumes semantic tokens only.
4. Preserve the **frozen three-pane topology** (ADR-0004) and all existing structural contracts.

## Non-goals (explicitly out of scope)

- Restructuring the workspace's information model or adding a playback/timeline scrubber (sub-project A).
- In-app rich deliverable viewers / canvas (sub-project B).
- Any new praxis/backend contract or real artifact emission (sub-project D). Deliverable cards in this pass render against the **existing** model; binding to real `agent_generated` attachments is sub-project A.
- Introducing any new saturated brand hue (would require a separate ADR per PRIN-3).
- Changing pane widths, the type scale ladder, the radius scale, the motion duration scale, or keyboard contracts — these existing scales are reused as-is.

## Identity & palette change — "Neutral Stone"

We retune **only the neutral ramp** of the workbench (canvas / surface / ink / border / muted / accent / sidebar / workspace / ring / overlay). Status tokens (running/success/warning), destructive, and ember are **unchanged**. The "Ash & Ember" name is retained; ADR-0014 gets an amendment note recording that the workbench neutral ramp moved from warm-beige to near-neutral stone for a more modern posture (no new saturated hue → not a full brand-posture change, but a MAJOR guidelines rev because foundation tokens move).

### Light theme (`:root`) — proposed values

| Token | Current (warm) | New (Neutral Stone) | Role |
|---|---|---|---|
| `--background` | `#f7f6f4` | `#f5f5f4` | canvas |
| `--card` | `#ffffff` | `#ffffff` | elevated surface |
| `--workspace` | `#faf9f7` | `#fafafa` | right rail |
| `--foreground` | `#2a2825` | `#1c1c1a` | primary ink (deepened) |
| `--primary` | `#2a2825` | `#1c1c1a` | ink CTA / user bubble |
| `--primary-foreground` | `#ffffff` | `#ffffff` | on-ink text |
| `--secondary` | `#eceae6` | `#ececeb` | secondary surfaces |
| `--muted` | `#f0eeea` | `#f0f0ee` | inset trays |
| `--muted-foreground` | `#5c5851` | `#6a6a66` | secondary labels (AA verified) |
| `--accent` | `#eae7e2` | `#ececeb` | row hover wash |
| `--border` | `#e3e1dc` | `#e6e5e2` | hairlines |
| `--sidebar` | `#ffffff` | `#ffffff` | left rail |
| `--sidebar-accent` | `#f2f0ec` | `#f1f1ef` | sidebar hover |
| `--sidebar-rail` | `var(--primary)` | `var(--primary)` | active rail (now deeper) |
| `--ring` | `rgba(42,40,37,0.55)` | `rgba(28,28,26,0.55)` | focus ring |
| `--overlay` | `rgba(42,40,37,0.45)` | `rgba(28,28,26,0.45)` | modal scrim |

### Dark theme (`:root.dark`) — proposed values

| Token | Current (warm smoke) | New (neutral smoke) |
|---|---|---|
| `--background` | `#191817` | `#1a1a19` |
| `--card` | `#232220` | `#232322` |
| `--workspace` | `#1f1e1c` | `#1f1f1e` |
| `--foreground` | `#efedea` | `#ededeb` |
| `--primary` | `#efedea` | `#ededeb` |
| `--primary-foreground` | `#191817` | `#1a1a19` |
| `--secondary` | `#2b2a27` | `#2b2b29` |
| `--muted` | `#232220` | `#232322` |
| `--muted-foreground` | `#b3afa8` | `#b1b1ab` (AA verified) |
| `--accent` | `#2b2a27` | `#2b2b29` |
| `--border` | `#343230` | `#343432` |
| `--sidebar` | `#1d1c1b` | `#1c1c1b` |
| `--ring` | `rgba(239,237,234,0.55)` | `rgba(237,237,235,0.55)` |
| `--overlay` | `rgba(12,11,10,0.6)` | `rgba(11,11,10,0.6)` |

Unchanged: all `--status-*` triplets, `--destructive*`, `--ember*`, radius scale, type scale, spacing/pane constants, animation tokens.

**Accessibility gate (COLOR-3, blocking):** before merge, verify with a contrast checker that (a) `--muted-foreground` on `--background`, `--card`, `--muted` meets WCAG AA (≥4.5:1 body / 3:1 large) in both themes; (b) every `*-foreground` on `*-soft` status pair still passes; (c) `--ring` meets 3:1 against adjacent surfaces. Adjust the candidate hex values if any pair fails — the table values are the starting point, not sacred.

## Component vocabulary (the polish, per pane)

### Chat pane (`apps/web/src/components/workbench/chat/`)

- **User turn:** right-aligned **ink bubble** — `bg-primary text-primary-foreground`, radius `12px 12px 4px 12px`, max-width ~72%. (Replaces today's light `secondary` bubble.)
- **Assistant turn:** full-width prose with a subtle **left hairline accent** (`border-l` in `--border`) and a small uppercase **role label** ("Assistant"). Prose keeps react-markdown + remark-gfm + rehype-highlight.
- **Turn rhythm:** hairline **divider** between turns instead of relying on bubble gaps alone; consistent vertical spacing on the existing spacing scale.
- **Structured data inset:** when the assistant emits a compact metric/figure line, render it in a `--muted`/`--workspace` mono inset card (read-affordance for the data/BI/report use cases) rather than inline prose. (Heuristic/markup-driven; no new data contract.)
- **Composer:** rounded (`--radius-lg`/`xl`), subtle 1px elevation, a tool-affordance row (attach, etc. — placeholders honoring UX-9 icon scale) above the send control; ink send button. Keeps `Enter` send / `Shift+Enter` newline (IA-5) and IME safety.
- Entrances stay on the existing `messageEntrance` preset / MOTION scale.

### Sidebar (`apps/web/src/components/workbench/sidebar/`)

- **Search** input (existing) restyled to the new border/radius rhythm.
- **Primary CTA:** ink **"新建任务"** pill (`bg-primary`, `rounded-full`).
- **Section labels:** small uppercase muted labels grouping rows (e.g. 进行中 / 最近) — structure-from-typography per PRIN-4.
- **Rows:** status **dot** (status tokens) + title; hover `--sidebar-accent`; **active** = `--sidebar-rail` ink left rail (2px) + `--sidebar-accent` bg + weight 600. Density on `body-sm`.
- Status dot color mapping reuses the status tokens (running/success/warning) + a neutral idle (`--muted-foreground`/`border`).

### Workspace (`apps/web/src/components/workbench/workspace/`) — visual language only

> Structure unchanged in this pass; sub-project A reorganizes it later. Here we only restyle the existing plan/tools/artifacts cards into the shared vocabulary so A inherits a clean base.

- **Card shell:** `bg-card` + hairline border + `--radius-lg`; header row with a `body-sm`/`label` **title** and an optional **status chip**.
- **Status chip:** small pill using a status `*-soft` bg + `*-foreground` text (e.g. "进行中 3/5", "2"). Replaces ad-hoc badges; AA-checked.
- **Plan card:** checklist with checkbox markers — done (filled success), in-progress (running outline), pending (muted outline); done labels muted + strikethrough.
- **Tool timeline (tools card):** vertical rail with **status nodes** (running = running token ring, success/error accordingly), tool name + duration on `caption`/`label`, existing expandable input/result disclosure restyled.
- **Deliverable card (artifacts card):** file-style rows — kind icon tile, name, meta (size · time / "生成中…"), trailing **download** affordance for ready items. Renders against the existing artifact model; forward-compatible with A's attachment binding.

### Cross-cutting

- **Spacing rhythm:** audit and normalize paddings/gaps to a consistent step set across panes (no arbitrary one-off values).
- **Typography:** apply the existing named scale consistently; no `text-[Npx]` escapes.
- **Motion:** all within MOTION-2 durations / MOTION-3 easings; honor `prefers-reduced-motion` (MOTION-4). No new motion primitives required.
- **States:** define consistent empty / loading (skeleton via `pulse-subtle`) / error treatments for sidebar lists, workspace cards, and chat.
- **Icons:** UX-9 scale, lucide default strokeWidth.

## Architecture & boundaries

- All token edits in `packages/ui/src/globals.css` only (COLOR-1). The `@theme inline` aliases already expose these to Tailwind v4; no config file changes.
- Component restyling stays in `apps/web/src/components/workbench/**`; consumes semantic tokens only (COLOR-2). Any unavoidable one-off carries a `TODO(ash-visual): rationale`.
- No changes to `packages/shared` types, the praxis client/contract, the reducer, or routing. (If the structured-data inset needs a render hint, derive it from existing message markup — do **not** change the data model.)
- Respect package layering: no domain logic or fetch into `packages/ui`.

## Files expected to change

- `packages/ui/src/globals.css` — neutral ramp retune (the only token file).
- `apps/web/src/components/workbench/chat/*` — message-bubble, composer, reasoning, answer-prompt restyle.
- `apps/web/src/components/workbench/sidebar/*` — sidebar, sidebar-row, section labels, footer-account, new-task CTA.
- `apps/web/src/components/workbench/workspace/*` — plan-card, tools-card, artifacts-card, artifact-button, status chip primitive.
- `packages/ui/src/components/*` — if a shared `StatusChip` / `StatusDot` primitive is extracted (no domain logic).
- Docs: `docs/design-guidelines.md` (MAJOR rev), `docs/adr/0014-*` (amendment note), affected `docs/components/*.md` (chat, sidebar, workspace) updated alongside code (per CLAUDE.md rule 5).

## Governance / documentation (required by repo norms)

- Bump `docs/design-guidelines.md` (MAJOR — foundation tokens moved); update the "Current Aesthetic" table and any rule examples that cited old hex values; record closed/justified entries in the Appendix A deviation register.
- Add an amendment note to ADR-0014 documenting the warm→neutral-stone ramp shift (rationale: modern/premium posture; no new saturated hue).
- Update `docs/components/workbench-chat.md`, `workbench-sidebar.md`, `workbench-workspace.md` to match the new component vocabulary.
- Design review per REV-1: verdict cites rule IDs; any MUST deviation goes to Appendix A with rationale.

## Testing & verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build` all green.
- Unit tests: keep existing reducer/projection tests passing (no logic change). Add/adjust component tests only where component structure changes (e.g. status chip rendering, active-row state).
- Manual visual verification in **both** light and dark themes across the three panes; verify reduced-motion path.
- Accessibility: run the COLOR-3 contrast gate above; record results in the PR.
- Visual regression is manual for this pass (no VR harness in repo); attach before/after screenshots in the PR for chat, sidebar, workspace in both themes.

## Risks & mitigations

- **Token shift ripples to marketing/auth zones** that also consume these neutrals → verify those zones still read correctly; ember/marketing accents unchanged so risk is low. Mitigation: smoke-check marketing pages in both themes.
- **Contrast regressions** from deeper ink / retuned muted-fg → blocking AA gate before merge.
- **Scope creep into sub-project A** (timeline/playback, attachment binding) → explicitly fenced in Non-goals; deliverable card stays on the existing model.
- **Guidelines drift** if hex values land differently than the table after AA tuning → guidelines + ADR note must reflect the *final* shipped values, not this draft's candidates.

## Open questions

- None blocking. Final hex values may shift slightly to pass the AA gate; that is expected and handled in implementation.
