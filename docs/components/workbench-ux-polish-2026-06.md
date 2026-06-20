# Workbench UX Polish — 2026-06

Status: spec (for PR review). Owner: design. Identity: "Ash & Ember" (ADR-0014).
Authority: `docs/design-guidelines.md` v1.1.1 (rule IDs PRIN/COLOR/TYPE/SPACE/MOTION/IA/UX/IMPL/REV).

This spec consolidates four findings — type scale, sidebar task list, chat/SSE optimistic
reconcile, tool-trace card — into ONE visual-language upgrade and a strict per-file change
plan so four implement agents can work in parallel without file collisions.

## 0. One visual language

The four fixes share one thesis: **hierarchy from weight + structure, not from size jumps or
color** (PRIN-4, TYPE-2). The central token edit lands first and raises the floor for the
whole workbench (heavier running copy, crisper secondary text, one new chrome token). The
three component fixes then express the SAME structural vocabulary:

- A **left accent rail** = "this is selected / this is the live timeline." Used by the sidebar
  active row and the tool-trace rail; precedent is `plan-card.tsx` (`border-l-2 border-primary`,
  -2px optical alignment).
- **Status carried by the existing COLOR-3 token triplets** (`status-*-soft` / `-foreground`)
  and the `StatusDot` primitive — never by new hues (COLOR-3, COLOR-2). Sidebar attention
  states and the tool-trace status node both consume these, retiring the bespoke single dot
  and the deforming text badge.
- **One spacing rhythm** on the SPACE token scale: groups breathe more than rows; hairlines
  (`border-sidebar-border` / `border-border`) separate zones instead of uniform stripes
  (PRIN-2, SPACE).
- **Restrained motion** unchanged in spirit (MOTION-1/2): the only motion edit is defensive —
  clearing GSAP inline `autoAlpha` so a re-keyed chat bubble can never get stuck hidden.

Net: denser-but-calmer chrome that reads heavier and more deliberate, distinct from generic
AI chat skins (PRIN-1).

## 1. Tokens + typography (lands FIRST, global)

Files: `packages/ui/src/globals.css`, `apps/web/src/app/[locale]/layout.tsx`,
`docs/design-guidelines.md` (governance).

### 1a. Type scale bump (TYPE-2 — MINOR revision, REV-1)

The scale leaves the as-built 11–15px ladder, so this is a TYPE-2 amendment requiring a
MINOR version bump + changelog + deviation note (REV-1, Appendix B). Edit the `@theme inline`
block (`globals.css:68-79`); keep proportional line-heights:

| Token | Old size / lh | New size / lh |
|-------|---------------|---------------|
| `label` | 0.75rem / 1rem | 0.8125rem / 1.125rem |
| `body-sm` | 0.8125rem / 1.125rem | 0.875rem / 1.25rem |
| `body` | 0.875rem / 1.25rem | 0.9375rem / 1.375rem |
| `body-lg` | 0.9375rem / 1.375rem | 1rem / 1.5rem |
| `caption` | 0.6875rem / 1rem | unchanged (Latin/numeric, CJK floor) |

Do NOT add an `html { font-size }` override — it would also scale rem spacing/pane geometry
(SPACE-4, `layout-constants.ts`). The token bump is the surgical lever.

### 1b. Weight tokens (thinness — TYPE-2 weight column)

Running copy is DM Sans 400 today; only `label` carries a weight token. Add weight tokens so
the bulk of the workbench reads heavier centrally (weight-led hierarchy, PRIN-4):

```
--text-body--font-weight: 500;
--text-body-sm--font-weight: 500;
```

Keep `body-lg`/`caption` at 400 to preserve hierarchy (PRIN-2). DM Sans 500 is already loaded
(`layout.tsx:19`), so NO `layout.tsx` font-weight change is required. `layout.tsx` is owned by
the tokens group only to keep the partition clean; edit it only if a weight not already in the
payload is chosen (it is not — stay on 500).

### 1c. Contrast (COLOR-7 — Appendix C + version bump)

`--muted-foreground` drives ~156 secondary-text sites and is the dominant "thin/faint" read.
Darken both themes, keeping WCAG AA (COLOR-8):

- light `#6e6a63` -> `#5c5851`
- dark `#a39f99` -> `#b3afa8`

Update Appendix C row 459 and bump the version (COLOR-7).

### 1d. New chrome token for the sidebar active rail (COLOR-1/COLOR-6/COLOR-7)

The sidebar selected state needs a token-compliant accent rail that is NOT ember (ember is
brand-only, COLOR-10) and reads on `--sidebar`. Add a sidebar-scoped rail token (both themes,
COLOR-6) so the sidebar agent never invents a literal:

```
--sidebar-rail: var(--primary);   /* ink rail; same in both themes via --primary inversion */
```

Expose via `@theme inline` as `--color-sidebar-rail`. Document in Appendix C (COLOR-7). The
sidebar agent then uses `border-sidebar-rail` / `bg-sidebar-rail` — no raw literal, no ember.

### 1e. Governance checklist (REV-1, blocking)

- Section 0: bump v1.1.1 -> **v1.2.0** (MINOR: TYPE-2 scale entry change + new token).
- TYPE-2 table: update size/line-height/weight columns for label/body-sm/body/body-lg.
- Appendix B: append a changelog line.
- Appendix C: update `--muted-foreground` row, add `--sidebar-rail` row.
- Appendix A: add a deviation-register entry noting the ladder moved past 11–15px by design.

## 2. Sidebar (builds on tokens)

Files: `task-section.tsx`, `sidebar-row.tsx`, `project-nav.tsx`, `lib/task-status.ts`,
`lib/praxis/summary-projection.ts`, `status-dot.tsx`, `docs/components/workbench-sidebar.md`,
`apps/web/messages/{zh,en}.json`.

1. **Deterministic sort** (`lib/task-status.ts` + applied in `task-section.tsx` before
   `slice(0,10)`): add a pure `taskStatusSortRank(status)` comparator. Bucket priority:
   `awaiting_input` -> `running` -> `pending` -> `failed` -> `completed`. Within a bucket keep
   insertion/LIFO order (no real timestamp exists — see step 5). One rule shared by session +
   server tasks (mergedTasks is already deduped upstream). (PRIN-1: active work first.)
2. **Active state** (`task-section.tsx` + `sidebar-row.tsx`): selected row = `bg-sidebar-accent`
   PLUS a 2px left rail `border-l-2 border-sidebar-rail` (token from 1d) PLUS title
   `font-semibold` PLUS `aria-current="page"`. Hover stays `hover:bg-sidebar-accent/60` so
   selected clearly outranks hover (PRIN-4, UX a11y). Apply identically to both row components
   (precedent: `plan-card.tsx`).
3. **Status elevation** (`task-section.tsx`, optionally `status-dot.tsx`): for non-running
   attention/terminal states render a small chip on the existing COLOR-3 triplets —
   `awaiting_input` = warning soft/foreground, `failed` = destructive, `completed` = success
   soft/foreground. Keep the animated `StatusDot` for `running`. Zero new literals (tokens
   exist `globals.css:52-60,135-143`). (COLOR-3.)
4. **Spacing rhythm** (`task-section.tsx`): larger inter-group gap than intra-group gap; a
   hairline `border-sidebar-border` between status zones; consistent row min-height; dot aligned
   to title baseline. All on the SPACE scale, no arbitrary values (SPACE). Pane widths are NOT
   touched, so `layout-constants.ts` stays in sync (no edit).
5. **Time signal** (`summary-projection.ts` + `task-section.tsx`): `TaskSummary` has no
   timestamp, so `summaryToTask` stamps `createdAt == updatedAt == request time` — every server
   task shows the SAME misleading relative string. Short-term fix: drive the secondary line off
   the **status label**, not `formatRelativeTime`, when `updatedAt` is the synthetic stamp.
   Long-term (note only, contract-first memory rule): add `updated_at` to the praxis
   `TaskSummary` OpenAPI schema and codegen — do NOT hand-edit generated types.
6. **Docs** (`workbench-sidebar.md:48-71`): replace stale raw literals (`text-[13px]`,
   `bg-blue-500`, `bg-emerald-500`, `size-1.5`) with the real tokens (`text-body-sm`,
   `bg-status-running` / `bg-status-success`, `StatusDot size-2`); document the new sort,
   grouping, and active-rail contract (COLOR-2/TYPE compliance).
7. **i18n**: any new group-header strings go in `messages/zh.json` + `messages/en.json` under
   `Workbench` (zh-CN baseline); run `pnpm i18n:check`. Reuse existing status keys
   (`running`/`awaitingInput`/`completed`/`failed`/`pending`).

## 3. Chat + SSE (builds on tokens)

Files: `lib/praxis/history-projection.ts`, `task-run-provider.tsx`,
`packages/shared/src/types.ts`, `chat/workbench-chat.tsx`, `docs/components/workbench-chat.md`.

Problem: the optimistic user bubble (`user-${id}` / `local-${id}-${n}`) and the history
projection's re-created bubble (`hist-${id}-user-${n}`) are different React keys for the SAME
logical turn -> duplicate or vanishing bubble across the live-stream -> `/history` reconcile.

1. **Stable correlation field** (`types.ts`): add optional `clientId?: string` to `Message`.
2. **Set it on optimistic appends** (`task-run-provider.tsx`): `startTask` (`user-${summary.id}`,
   line 171) and `sendFollowUp` (`local-${taskId}-${n}`, line 299).
3. **Reconcile in history** (`history-projection.ts`): in the `user_message` branch, before
   `pushMessage`, if an existing seed message has a `clientId` and matching content, reconcile
   IN PLACE (keep the same id/React key, update role/content/createdAt from history) instead of
   appending a new `hist-*` message. Removes both the duplicate AND the key churn.
4. **Motion safety** (`workbench-chat.tsx`): after `gsap.from(newBubbles, messageEntrance())`,
   `gsap.set` the full bubble set to clear inline `autoAlpha`/visibility on timeline complete (or
   diff `newBubbles` by id rather than by `prevMessageCountRef` index slice) so a re-keyed bubble
   can never stay `visibility:hidden` during the live window (MOTION-1: motion never hides
   content).
5. **Docs** (`workbench-chat.md`): document the single-source-of-truth invariant — the
   optimistic user message is reconciled (not duplicated) via `clientId` match.

No reducer emission change is needed; the live path already seeds the user bubble.

## 4. Tool trace (builds on tokens)

Files: `workspace/tools-card.tsx`, `packages/ui/src/components/badge.tsx`,
`packages/shared/src/types.ts`, `docs/components/workbench-workspace.md`,
`apps/web/messages/{zh,en}.json`.

1. **Badge deformation fix** (root cause): the `<li>` is `flex gap-2` with default
   `align-items: stretch`, so a badge box gets stretched vertically by a two-line content
   sibling; the base pill also lacked `shrink-0`/`whitespace-nowrap` so it squished
   horizontally in the ~380px rail. **As shipped:** the `badge.tsx` base cva is hardened
   with `shrink-0 whitespace-nowrap` (deformation can never recur for any Badge consumer),
   and `tools-card.tsx` drops the per-row status *Badge* entirely in favor of the
   `StatusDot` rail node below — so a stretched status pill no longer exists in the trace.
2. **Timeline rail** (`tools-card.tsx`): replace the per-row static `Wrench` + zebra stripes
   with a single vertical rail; each row hangs a `StatusDot` node on the rail (map
   success/error/running -> StatusDot variant, pulse for running). Reuse `plan-card.tsx`'s
   `border-l` + -2px optical-alignment convention (COLOR-2, precedent). This frees the text
   badge to be optional.
3. **Row hierarchy** (`tools-card.tsx`): line 1 = mono tool chip + right-aligned duration
   (`text-caption text-muted-foreground`, `tabular-nums`); line 2 = summary (`text-body-sm
   text-muted-foreground`). One status language (rail dot), not redundant dot+badge+spinner.
4. **Expandable detail** (`types.ts` + `tools-card.tsx`): add optional `input?: string` /
   `result?: string` to `ToolTrace`; render a disclosure (mono `pre`) gated on detail presence.
   `startedAt` already exists and MAY surface as a timestamp.
5. **Docs** (`workbench-workspace.md:65-75,156-158`): document the rail, StatusDot mapping,
   duration placement, expandable input/result contract; keep oldest-top/newest-bottom
   orientation (do not silently flip).
6. **i18n**: new strings (`Input`/`Result`/`输入`/`结果`, expand/collapse) under `Workbench`
   in `messages/zh.json` + `messages/en.json`; reuse `toolStatusOk/Error/Running`; run
   `pnpm i18n:check`.

## 5. File ownership (strict, disjoint)

`tokens` runs FIRST and alone; the other three run in parallel and MUST NOT share a file.
Note: the i18n catalogs are `apps/web/messages/zh.json` + `en.json` (the research JSON's
`zh-CN.json` is stale). `messages/*.json` and `packages/shared/src/types.ts` are SHARED
between sidebar/chatSse/toolTrace — to keep the partition disjoint, assign as below and have
each agent edit only its own keys; if collision risk remains, serialize the two writers.

- **tokens**: `packages/ui/src/globals.css`, `apps/web/src/app/[locale]/layout.tsx`,
  `docs/design-guidelines.md`.
- **sidebar**: `apps/web/src/components/workbench/sidebar/*.tsx`,
  `apps/web/src/lib/task-status.ts`, `apps/web/src/lib/praxis/summary-projection.ts`,
  `docs/components/workbench-sidebar.md`. (Owns `messages/*.json` writes for sidebar keys.)
- **chatSse**: `apps/web/src/components/workbench/chat/*.tsx`,
  `apps/web/src/components/workbench/task-run-provider.tsx`,
  `apps/web/src/components/workbench/runtime-event-reducer.ts`,
  `apps/web/src/lib/praxis/history-projection.ts`,
  `packages/shared/src/types.ts` (owns the `Message.clientId` add),
  `docs/components/workbench-chat.md`.
- **toolTrace**: `apps/web/src/components/workbench/workspace/tools-card.tsx`,
  `packages/ui/src/components/badge.tsx`,
  `docs/components/workbench-workspace.md`. (`ToolTrace.input/result` add to
  `packages/shared/src/types.ts` must be coordinated with chatSse — chatSse owns the file;
  toolTrace hands chatSse the `ToolTrace` field diff, OR the two type edits are serialized.)
