# Workbench Bugfixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: each task is dispatched to a fresh subagent that
> MUST use `superpowers:systematic-debugging` (for the behavioural bugs) and
> `superpowers:test-driven-development` (for every fix). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix seven reported Workbench defects/improvements across two PRs.

**Architecture:** ash = Next.js (App Router) + Turborepo. Workbench UI under `apps/web/src/components/workbench`.
Praxis runtime contract is codegen'd; SSE is the only hand-written transport. Chat state lives in
`task-run-provider.tsx` (session runs) reduced by `runtime-event-reducer.ts` (live deltas) and
`history-projection.ts` (persisted `/history`).

**Tech Stack:** TypeScript (strict), React 19, next-intl v4, Tailwind v4, Radix UI, GSAP, Vitest.

## Global Constraints

- Comments + dev logs in English; user-facing strings zh-CN baseline via next-intl catalogs
  (`apps/web/messages/{zh,en}.json`) — every new string added to BOTH, keys validated by `pnpm i18n:check`.
- No cogito import graph into browser packages. Respect design tokens (no rogue palette literals) per ADR-0013/0014.
- All praxis API calls remain codegen'd; do not hand-edit `generated.ts`.
- Gate each task on `pnpm lint && pnpm typecheck && pnpm test`. Baseline is GREEN (179 tests pass).
- Two PRs (user decision): **PR-A** = the 6 chat/sidebar fixes; **PR-B** = i18n migration (separate branch off `origin/main`).

---

## PR-A — Chat + Sidebar fixes (branch: `worktree-workbench-bugfixes`)

### Task A1: `+ New task` navigation bug

**Files:** Modify `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx` (lines 181-186 expanded button, 260-262 collapsed rail).

**Defect:** Both "+ New task" affordances use `<Link href="/">` → lands on the marketing home.
**Fix:** Point both to `/app` (the workbench home `workbench-home.tsx`, which hosts the new-task composer +
skill selection). Keep using `@/i18n/navigation` `Link` (resolves to `/zh/app`).

**Acceptance:** Clicking "+ New task" (expanded and collapsed rail) opens the workbench home composer, not marketing.
TDD: a test asserting the New-task link `href` is `/app`.

### Task A2: Sidebar task/project overflow — independent scroll

**Files:** Modify `workbench-sidebar.tsx` (lines 216-245 list region), possibly `task-section.tsx`,
`project-section.tsx`. Add a height token if needed in `apps/web/src/lib/layout-constants.ts`.

**Defect:** A single `ScrollArea` wraps both sections; with many tasks the list overflows past the
viewport and pushes the footer out.
**Fix (chosen design — independent scroll):** Replace the single wrapping `ScrollArea` with TWO bounded
scroll regions inside the flex column — Tasks region (`flex-1 min-h-0` with its own `ScrollArea`) and a
Projects region (bounded, e.g. `max-h` ~40% with its own `ScrollArea`), separated by the existing
`Separator`. `FooterAccount` stays pinned (`mt-auto`). Project section must stay visible regardless of
task count. Remove the `slice(0,10)` caps if they exist (scroll, don't truncate) OR keep a sensible cap —
prefer scroll so all items are reachable.

**Acceptance:** With 50 tasks + 20 projects, the sidebar never exceeds viewport height; Tasks scroll
independently; Projects header + list stay visible; footer pinned. TDD where feasible (render many items,
assert both section containers present + footer present).

### Task A3: Reasoning UI redesign + agent name "Ash"

**Files:** New component `apps/web/src/components/workbench/chat/reasoning.tsx` (shadcn-AI-reasoning style);
modify `message-bubble.tsx` (thinking case, lines 50-59); `messages/{zh,en}.json`.

**Spec:** Build a Reasoning disclosure that:
- Auto-EXPANDS while the thinking block is actively streaming, AUTO-COLLAPSES shortly after it finishes.
- Header shows "Ash 思考中…" (zh) / "Ash is thinking…" (en) while streaming; "已思考 {sec}s" / "Thought for {sec}s"
  when done (track duration). Muted, secondary (PRIN-2), animated chevron.
- Renders `block.text` (markdown ok) in the body, monospace/relaxed.
- Agent display name is **Ash** — replace the generic "Agent" copy here and in the running indicator (Task A4).

Reference behaviour: https://www.shadcn.io/ai/reasoning . Use existing tokens + Radix Collapsible (already a dep
via Radix) or a controlled `<details>` enhancement; respect design-guidelines.

**Acceptance:** A streaming thinking block shows an open, animated "Ash 思考中…" panel; after completion it
collapses to "已思考 Ns". TDD: component test for streaming vs done states + duration label.

### Task A4: "Agent thinking" indicator never disappears

**Files:** `workbench-chat.tsx` (lines 223-242 running placeholder), possibly `runtime-event-reducer.ts`,
`task-run-provider.tsx`.

**REQUIRED:** Use systematic-debugging — REPRODUCE first (write a failing test that drives a task from
running → terminal and asserts the indicator is gone). Confirmed leads:
- Placeholder is bound to `active.status === "running"`. Status terminalises via `stream_end`
  (completed/failed) and `turn_paused` (awaiting_input). Verify the actual path where it stays "running"
  (e.g. fake client stream ending without `stream_end`; or indicator showing for the whole stream while
  assistant text is already rendering, which reads as "stuck").
**Fix direction:** Only show the working indicator when status is non-terminal AND no assistant message is
currently streaming its first content (so it yields to streamed text), and guarantee it clears on every
terminal/awaiting_input transition. Rename copy to "Ash …" (consistent with A3).

**Acceptance:** After a task completes, fails, or pauses for input, the indicator is gone. Failing-first test
proving the prior behaviour, then green.

### Task A5: Running-state loading guidance + stop/terminate button (#6)

**Files:** `workbench-chat.tsx` (header cancel button lines 155-163, running region), `workbench-app.tsx`
(onCancel wiring ~line 125), `messages/{zh,en}.json`.

**REQUIRED:** systematic-debugging — confirm WHEN the cancel button + loading guidance fail to appear.
Leads: cancel button shows only when `onCancel` is passed AND `status === "running" || pendingQuestion`.
The initial run starts at `status: "pending"` (provider line 167) then flips to "running" (line 195) — check
"pending" coverage and that the task view passes `onCancel` on the first run (not just follow-ups).
**Fix:** Ensure a clear loading indicator AND a stop/terminate button are visible for the whole non-terminal
running window (pending + running + awaiting where cancel is valid). Wire `cancelTask` everywhere a task can
run (including the home-started first run). Use the existing `useCancelTask` + `POST /v1/tasks/{id}/cancel`.

**Acceptance:** While a task runs (from first start through streaming), the user sees loading guidance and a
working Stop button that cancels (status → failed/cancelled, stream aborted). TDD covering button visibility
across statuses + cancel invocation.

### Task A6: User message not rendered until history refresh (#7)

**Files:** systematic-debugging across `workbench-chat.tsx`, `workbench-app.tsx`, `task-run-provider.tsx`,
`composer.tsx`.

**REQUIRED:** Reproduce FIRST. Confirmed: BOTH `startTask` (provider 170-180) and `sendFollowUp` (308-318)
already insert an optimistic user bubble with `clientId` and `upsert`. So the defect is render/propagation,
not insertion. Investigate: does the chat view read the live task from `useTaskRun`/`getRun` and re-render on
`upsert`? Is the first user message (home-started task) shown before navigation to the task view? Is `sendDraft`
routing to `onFollowUp` (provider) vs local append (workbench-chat 84-92)?
**Fix:** Make the just-sent user message appear immediately in the chat panel (no refresh), without creating a
duplicate when `/history` reconciles (the `clientId` dedupe in `reconcileOrAppend` must still hold).

**Acceptance:** Sending a message (first start AND follow-up) shows the user bubble instantly; after history
loads there is exactly one user bubble. Failing-first test, then green.

### Task A7: Unify streaming-delta vs history display logic (#2)

**Files:** `runtime-event-reducer.ts`, `history-projection.ts`, `block-fold.ts`, `tool-trace.ts`,
`message-bubble.tsx`.

**Goal:** The same logical message must render identically whether built from live `StreamEvent` deltas or
from a `/history` `MessagePage`. Known divergences (from exploration): tool-trace derivation runs always in
history but only on block boundaries while streaming; thinking/text block construction paths differ; message
reconciliation differs (id upsert vs clientId). Audit both paths, extract/share the projection so a message
+ its blocks + tool traces are equivalent post-stream and post-history. Add tests that drive the SAME praxis
message through both paths and assert equal `Message`/`toolTraces` output.

**Acceptance:** Property/example test: a fixture turn reduced live === same turn projected from history (blocks,
order, tool traces, thinking). No visual jump when a streamed turn is later replaced by its history version.

---

## PR-B — i18n: app area cookie-based, marketing keeps `/[locale]/` (branch: `feat/i18n-app-cookie` off `origin/main`)

### Task B1: Move the app zone out of the locale segment

**User decision:** marketing + auth keep `/[locale]/` prefixed routing (SEO); the `(app)` workbench + `c/`
conversations become non-prefixed (`/app`, `/c`) with locale from a cookie.

**Files / moves:**
- Convert to multiple root layouts (remove the single pass-through `app/layout.tsx`):
  - `app/(site)/[locale]/layout.tsx` — html/body/providers, locale from path (move current `[locale]/layout.tsx`).
    Under it: `(marketing)/`, `(auth)/`.
  - `app/(workbench)/layout.tsx` — html/body/providers, locale from COOKIE. Under it: `app/...`, `c/...`
    (move `(app)/` group and `c/[conversationId]/`).
- `apps/web/src/i18n/request.ts` — resolve `requestLocale` (path) first; when absent (app zone) read the
  `ash_locale` cookie, else `routing.defaultLocale`.
- `apps/web/src/proxy.ts` — run the next-intl middleware ONLY for the localized zone; for `/app` and `/c`
  do the auth check then `NextResponse.next()` (no locale redirect). Keep refresh-token auth gating.
- Workbench components that navigate within the app zone: swap `@/i18n/navigation` `Link`/`useRouter`/
  `usePathname` → plain `next/link` + `next/navigation` (no locale prefix). Marketing/auth keep
  `@/i18n/navigation`. Affected app-zone files include: `workbench-sidebar.tsx`, `task-section.tsx`,
  `project-section.tsx`, `project-nav.tsx`, `sidebar-row.tsx`, `workbench-home.tsx`, `demo-banner.tsx`,
  `command-palette.tsx` (verify each is app-zone before switching).
- App-zone pages: drop `params.locale` + `setRequestLocale`; locale now comes from cookie via request config.
- Add a cookie writer for locale selection inside the app zone (a small `setLocaleCookie` server action or
  route) + an in-app locale switcher that sets `ash_locale` and refreshes.

**REQUIRED:** This is architectural — proceed in small verified steps (move → build → fix imports → build).
Use systematic-debugging when builds break. Validate Next.js multiple-root-layout rules (full reload between
zones is expected/acceptable).

**Acceptance:**
- `/zh/product`, `/en/product` still work (marketing localized, prefixed).
- `/app`, `/app/tasks`, `/app/task/{id}`, `/c/{id}` work WITHOUT a locale prefix; language honoured from the
  `ash_locale` cookie; switching language in-app persists via cookie and re-renders.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green; `pnpm i18n:check` green.

---

## Self-Review notes

- Every behavioural bug (A4, A5, A6) starts with a REPRODUCING failing test (systematic-debugging) because the
  naive "feature missing" assumption is false — infra partly exists; the defects are propagation/timing/state.
- A3/A4 share the "Ash" naming + the running/thinking surfaces — implement A3 then A4 to avoid churn.
- A4/A5/A6/A7 all touch chat files; run them sequentially (one subagent at a time, review between) to avoid
  conflicts. A1/A2 (sidebar) are independent and may run first/in parallel.
- PR-A and PR-B live on independent branches off `origin/main`; expect minor merge conflicts in
  `workbench-sidebar.tsx` + chat files, resolved at integration time (the user accepted this tradeoff).
