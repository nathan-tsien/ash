# Workbench Visual/UX System Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the workbench's visual language ("Neutral Stone" palette + consistent component vocabulary) within the existing "Ash & Ember" identity, across all three panes.

**Architecture:** Token-first. All color literals change only in `packages/ui/src/globals.css` (COLOR-1); application components consume semantic tokens (COLOR-2) and gain a shared `StatusChip` primitive. Pure-visual edits are verified by build + an automated WCAG contrast script + manual review in both themes; behavior-bearing primitives get unit tests.

**Tech Stack:** Next.js (App Router), React 19, Tailwind v4 (`@theme inline`, no config file), TypeScript strict, vitest + @testing-library/react (apps/web only), next-intl, lucide-react, GSAP.

**Spec:** `docs/superpowers/specs/2026-06-28-workbench-visual-system-pass-design.md`

## Global Constraints

- COLOR-1: every HEX/RGBA literal lives only in `packages/ui/src/globals.css` under `:root` and `:root.dark`. No raw palette literals in components.
- COLOR-2: components use semantic tokens (`bg-background`, `text-foreground`, status tokens). Any unavoidable escape carries `TODO(ash-visual): rationale`.
- COLOR-3 / COLOR-6: every token has both a light and dark value; every `*-foreground` on `*-soft` and every body text/background pair meets WCAG AA.
- PRIN-3/PRIN-4: no new saturated hue; hierarchy from structure/weight, color only for status + destructive.
- TYPE-2: use the named type scale (`text-caption/label/body-sm/body/body-lg`); no `text-[Npx]`.
- MOTION-2/3/4: stay within the existing duration/easing scale; honor `prefers-reduced-motion`.
- Do NOT change: pane widths (SPACE-4), radius scale, type scale ladder, status/ember/destructive token values, keyboard contracts (IA-4/IA-5), praxis client/contract/reducer, `packages/shared` types.
- `packages/ui` has no test runner; tests for shared primitives live in `apps/web`.
- Commit after each task. Branch: `design/workbench-visual-system-pass` (or the execution worktree's branch).

---

### Task 1: Neutral Stone palette retune

Retune only the neutral ramp in `globals.css` (canvas/surface/ink/border/muted/accent/sidebar/workspace/ring/overlay) for both themes, and add an automated contrast gate. Status, ember, and destructive tokens are untouched.

**Files:**
- Modify: `packages/ui/src/globals.css` (`:root` lines ~100-155, `:root.dark` lines ~162-213, header comment lines ~3-24)
- Create: `apps/web/scripts/check-contrast.mjs`
- Modify: `apps/web/package.json` (add `contrast` script)

**Interfaces:**
- Produces: the retuned semantic tokens consumed by every later task (no new token names; `--sidebar-rail`, status tokens, etc. keep their names and now resolve to deeper ink / unchanged status hues).

- [ ] **Step 1: Write the failing contrast gate**

Create `apps/web/scripts/check-contrast.mjs` (pure JS, no deps — WCAG 2.1 relative luminance):

```js
// Automated WCAG AA gate for the Neutral Stone ramp (COLOR-3). No deps.
// Run: node scripts/check-contrast.mjs   (exit 1 on any failure)
const hex = (h) => {
  const n = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [label, fg, bg, minRatio]
const PAIRS = [
  // light — body text needs >= 4.5
  ["L muted-fg / background", "#6a6a66", "#f5f5f4", 4.5],
  ["L muted-fg / card", "#6a6a66", "#ffffff", 4.5],
  ["L muted-fg / muted", "#6a6a66", "#f0f0ee", 4.5],
  ["L muted-fg / workspace", "#6a6a66", "#fafafa", 4.5],
  ["L foreground / background", "#1c1c1a", "#f5f5f4", 4.5],
  ["L primary-fg / primary", "#ffffff", "#1c1c1a", 4.5],
  // light status (unchanged values, regression guard)
  ["L running-fg / running-soft", "#1d4ed8", "#eff6ff", 4.5],
  ["L success-fg / success-soft", "#047857", "#ecfdf5", 4.5],
  ["L warning-fg / warning-soft", "#b45309", "#fffbeb", 4.5],
  // dark — body text >= 4.5
  ["D muted-fg / background", "#b1b1ab", "#1a1a19", 4.5],
  ["D muted-fg / card", "#b1b1ab", "#232322", 4.5],
  ["D foreground / background", "#ededeb", "#1a1a19", 4.5],
  ["D primary-fg / primary", "#1a1a19", "#ededeb", 4.5],
  ["D running-fg / running-soft", "#93c5fd", "#1c2940", 4.5],
  ["D success-fg / success-soft", "#6ee7b7", "#122b22", 4.5],
  ["D warning-fg / warning-soft", "#fcd34d", "#2e2510", 4.5],
];

let failed = 0;
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1  (min ${min})  ${label}`);
}
if (failed) {
  console.error(`\n${failed} pair(s) below AA — adjust the hex in globals.css and re-run.`);
  process.exit(1);
}
console.log("\nAll pairs meet WCAG AA.");
```

- [ ] **Step 2: Run the gate against the candidate values — verify it computes**

Run: `cd apps/web && node scripts/check-contrast.mjs`
Expected: prints a PASS/FAIL line per pair. If every line is PASS, the candidate ramp is AA-clean. If any FAIL, nudge that hex darker/lighter in Step 3's table before applying and re-run until all PASS. (Candidate values below are expected to pass.)

- [ ] **Step 3: Apply the light-theme ramp**

In `packages/ui/src/globals.css` `:root` block, replace the neutral values (leave `--radius`, all `--status-*`, `--ember*`, `--destructive` exactly as-is):

```css
  --background: #f5f5f4;
  --foreground: #1c1c1a;
  --card: #ffffff;
  --card-foreground: #1c1c1a;
  --popover: #ffffff;
  --popover-foreground: #1c1c1a;

  --primary: #1c1c1a;
  --primary-foreground: #ffffff;

  --secondary: #ececeb;
  --secondary-foreground: #1c1c1a;

  --muted: #f0f0ee;
  --muted-foreground: #6a6a66;

  --accent: #ececeb;
  --accent-foreground: #1c1c1a;

  --destructive: #c53030;
  --border: #e6e5e2;
  --input: #e6e5e2;
  --ring: rgba(28, 28, 26, 0.55);

  --sidebar: #ffffff;
  --sidebar-foreground: #1c1c1a;
  --sidebar-border: #eceae8;
  --sidebar-accent: #f1f1ef;
  --sidebar-rail: var(--primary);

  --workspace: #fafafa;

  --overlay: rgba(28, 28, 26, 0.45);
```

- [ ] **Step 4: Apply the dark-theme ramp**

In the `:root.dark` block, replace the neutral values (leave all `--status-*`, `--ember*`, `--destructive` as-is):

```css
  --background: #1a1a19;
  --foreground: #ededeb;
  --card: #232322;
  --card-foreground: #ededeb;
  --popover: #232322;
  --popover-foreground: #ededeb;

  --primary: #ededeb;
  --primary-foreground: #1a1a19;

  --secondary: #2b2b29;
  --secondary-foreground: #ededeb;

  --muted: #232322;
  --muted-foreground: #b1b1ab;

  --accent: #2b2b29;
  --accent-foreground: #ededeb;

  --destructive: #e55050;
  --border: #343432;
  --input: #343432;
  --ring: rgba(237, 237, 235, 0.55);

  --sidebar: #1c1c1b;
  --sidebar-foreground: #ededeb;
  --sidebar-border: #2b2b29;
  --sidebar-accent: #2b2b29;
  --sidebar-rail: var(--primary);

  --workspace: #1f1f1e;

  --overlay: rgba(11, 11, 10, 0.6);
```

- [ ] **Step 5: Update the header comment** (lines ~6-13) so the identity note matches reality:

```css
 * Identity: "Ash & Ember" (ADR-0014), workbench neutral ramp retuned to
 * "Neutral Stone" (2026-06): warmth pulled almost out for a more modern,
 * premium read; ink deepened for crisper contrast. Status + ember unchanged.
 *
 *   ink           #1C1C1A  primary ink + solid fills
 *   stone paper   #F5F5F4  canvas / subtle trays
 *   white sheets  #FFFFFF  elevated surfaces + text on fills
```

- [ ] **Step 6: Re-run the contrast gate against the applied values**

Run: `cd apps/web && node scripts/check-contrast.mjs`
Expected: `All pairs meet WCAG AA.` (exit 0)

- [ ] **Step 7: Add the `contrast` script to `apps/web/package.json`**

In the `"scripts"` block add: `"contrast": "node scripts/check-contrast.mjs",`

- [ ] **Step 8: Build + manual smoke**

Run: `pnpm --filter web build`
Expected: builds clean.
Manual: `pnpm --filter web dev`, open the workbench, toggle light/dark — confirm the canvas reads cleaner/cooler, ink looks deeper, nothing illegible. Smoke the marketing landing page in both themes (shares these neutrals; ember accent should be unchanged).

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/globals.css apps/web/scripts/check-contrast.mjs apps/web/package.json
git commit -m "feat(ui): Neutral Stone palette retune + WCAG contrast gate"
```

---

### Task 2: `StatusChip` shared primitive

A presentation-only chip (token-based) for workspace card headers (e.g. progress "3/5", deliverable count). Mirrors `StatusDot`'s variant philosophy.

**Files:**
- Create: `packages/ui/src/components/status-chip.tsx`
- Test: `apps/web/src/lib/__tests__/status-chip.test.tsx`

**Interfaces:**
- Produces: `StatusChip` — `{ variant?: "running" | "success" | "warning" | "neutral"; className?: string; children: ReactNode }`, importable as `@ash/ui/status-chip`. Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/__tests__/status-chip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { StatusChip } from "@ash/ui/status-chip";
import { describe, expect, it } from "vitest";

describe("StatusChip", () => {
  it("renders its children", () => {
    render(<StatusChip variant="running">3/5</StatusChip>);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("applies the variant's status token classes", () => {
    render(<StatusChip variant="success">2</StatusChip>);
    const chip = screen.getByText("2");
    expect(chip.className).toContain("bg-status-success-soft");
    expect(chip.className).toContain("text-status-success-foreground");
  });

  it("defaults to the neutral variant", () => {
    render(<StatusChip>idle</StatusChip>);
    const chip = screen.getByText("idle");
    expect(chip.className).toContain("bg-muted");
    expect(chip.className).toContain("text-muted-foreground");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- status-chip`
Expected: FAIL — cannot resolve `@ash/ui/status-chip`.

- [ ] **Step 3: Implement the primitive**

Create `packages/ui/src/components/status-chip.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

// Presentation-only status chip (COLOR-3 / IMPL-7). Variants are visual names,
// not app domain statuses — callers map domain -> variant, so packages/ui never
// imports domain types. Built only from status token triplets + muted (no raw
// palette literals, COLOR-2).
const statusChipVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium",
  {
    variants: {
      variant: {
        running: "bg-status-running-soft text-status-running-foreground",
        success: "bg-status-success-soft text-status-success-foreground",
        warning: "bg-status-warning-soft text-status-warning-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface StatusChipProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusChipVariants> {}

function StatusChip({ className, variant, ...props }: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      className={cn(statusChipVariants({ variant }), className)}
      {...props}
    />
  );
}

export { StatusChip, statusChipVariants };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- status-chip`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @ash/ui typecheck && pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/status-chip.tsx apps/web/src/lib/__tests__/status-chip.test.tsx
git commit -m "feat(ui): add StatusChip primitive"
```

---

### Task 3: Chat pane polish

Ink user bubble (asymmetric radius), assistant role label, hairline turn dividers, ink send button. Pure-visual; verified by build + manual (full render tests need a next-intl provider harness that does not exist — out of scope for this pass, matching the spec's manual-visual-regression note).

**Files:**
- Modify: `apps/web/src/components/workbench/chat/message-bubble.tsx:115-187`
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx:232-253`
- Modify: `apps/web/src/components/workbench/chat/composer.tsx:73-84`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Ink user bubble + assistant role label (message-bubble.tsx)**

Replace the inner content block (the `<div className={cn("text-sm leading-relaxed", isUser ? ... : ...)}>` wrapper and its children, lines ~132-157) with:

```tsx
          <div
            className={cn(
              "text-sm leading-relaxed",
              isUser
                // User: ink chip, asymmetric corner anchors it to the right edge.
                ? "rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground"
                // Assistant: borderless prose directly on the canvas.
                : "text-foreground",
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-left">{text}</p>
            ) : (
              <div className="prose-chat flex flex-col gap-2 text-left">
                {message.blocks.map((block, i) => (
                  <AssistantBlock
                    key={i}
                    block={block}
                    t={t}
                    isStreaming={message.isStreaming ?? false}
                    isLastBlock={i === message.blocks.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
```

Then, for the assistant role label, insert this block immediately BEFORE that inner content `<div>` (i.e. right after the opening of the `relative` wrapper at line ~131), so the label sits above assistant prose only:

```tsx
          {!isUser && (
            <p className="mb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t("roleAssistant")}
            </p>
          )}
```

- [ ] **Step 2: Add the `roleAssistant` i18n key**

Add `"roleAssistant"` to the `Workbench` namespace in every message catalog. Find them:

Run: `ls apps/web/messages 2>/dev/null || grep -rl '"Workbench"' apps/web --include=*.json | head`

For each locale file, add under `"Workbench"`: `"roleAssistant": "Assistant"` for `en`, `"roleAssistant": "助手"` for `zh-CN` (match the file's existing language; keep key ordering tidy).

- [ ] **Step 3: Hairline turn dividers (workbench-chat.tsx)**

Replace the messages container `<div>` opening (line ~232-238) and the `.map` wrapper (line ~248-252) so consecutive turns are separated by a hairline. Change the container class from `gap-4` to `gap-0`, and give each turn after the first a top divider:

Container (line ~233): change
`className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"`
to
`className="mx-auto flex w-full max-w-3xl flex-col gap-0 px-4 py-6"`

Map wrapper (line ~248-252): change
```tsx
              messages.map((m) => (
                <div key={m.id} data-message-id={m.id} className="message-bubble">
                  <MessageBubble locale={locale} message={m} />
                </div>
              ))
```
to
```tsx
              messages.map((m, i) => (
                <div
                  key={m.id}
                  data-message-id={m.id}
                  className={cn(
                    "message-bubble",
                    i > 0 && "mt-4 border-t border-border/60 pt-4",
                  )}
                >
                  <MessageBubble locale={locale} message={m} />
                </div>
              ))
```

Add the `cn` import if not present: at the top of `workbench-chat.tsx`, add `import { cn } from "@ash/ui/lib/utils";` (check the existing import list first — only add if missing).

- [ ] **Step 4: Ink send button (composer.tsx)**

In `composer.tsx`, change the send `<Button>` (line ~73-84) from `variant="pill"` to `variant="default"` so the primary action reads as ink:

```tsx
          <Button
            ref={sendButtonRef}
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              handleSendPress();
              onSend();
            }}
          >
            {t("send")}
          </Button>
```

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: no errors, clean build.

- [ ] **Step 6: Manual visual verification**

Run: `pnpm --filter web dev`, open a task with a multi-turn conversation. Confirm in BOTH themes: user turns are ink bubbles pinned right with a flattened bottom-right corner; assistant turns show a small "Assistant/助手" label above the prose; a hairline divider separates consecutive turns; the send button is ink. Toggle `prefers-reduced-motion` (DevTools rendering) and confirm entrances still settle (content visible).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/workbench/chat/ apps/web/messages
git commit -m "feat(workbench): chat pane polish — ink user bubble, role label, turn dividers, ink send"
```

---

### Task 4: Workspace cards polish

Wrap plan/tools/artifacts into the shared card shell (`bg-card` + hairline border + `--radius-lg`) with a header (title + optional `StatusChip`); drop the inter-card `<Separator>`s. Behavior unchanged. Uses the Task 2 primitive.

**Files:**
- Modify: `apps/web/src/components/workbench/workspace/plan-card.tsx`
- Modify: `apps/web/src/components/workbench/workspace/tools-card.tsx`
- Modify: `apps/web/src/components/workbench/workspace/artifacts-card.tsx`
- Modify: `apps/web/src/components/workbench/workspace/workbench-workspace.tsx:24-32`

**Interfaces:**
- Consumes: `StatusChip` from `@ash/ui/status-chip` (Task 2).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Plan card → card shell + progress chip (plan-card.tsx)**

Replace the component body (the returned JSX, lines ~9-41) with a card shell. The header shows a progress chip `done/total` when there are steps:

```tsx
export async function PlanCard({ steps }: { steps: PlanStep[] }) {
  const t = await getTranslations("Workbench");
  const done = steps.filter((s) => s.status === "done").length;
  const hasRunning = steps.some((s) => s.status === "running");

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
          {t("planHeading")}
        </h2>
        {steps.length > 0 ? (
          <StatusChip variant={hasRunning ? "running" : done === steps.length ? "success" : "neutral"}>
            {done}/{steps.length}
          </StatusChip>
        ) : null}
      </div>
      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyPlanSteps")}</p>
      ) : (
        <ol className="space-y-1">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex gap-2 rounded-md px-1 py-1.5 text-sm leading-snug"
            >
              <PlanStatusIcon status={step.status} />
              <span
                className={cn(
                  "flex-1",
                  step.status === "running" && "border-l-2 border-primary pl-3 -ml-[2px]",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

Add the import at the top: `import { StatusChip } from "@ash/ui/status-chip";` (keep the existing `cn`, lucide, and `getTranslations` imports; `PlanStatusIcon` is unchanged below).

- [ ] **Step 2: Tools card → card shell (tools-card.tsx)**

Wrap the existing content in the card shell. Replace the outer `<div className="space-y-2">` (line ~13) and its heading with:

```tsx
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2.5 text-label font-semibold uppercase tracking-wide text-muted-foreground">
        {t("toolsHeading")}
      </h2>
      {traces.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t("emptyTools")}</p>
      ) : (
        <ol className="ml-1">
          {traces.map((trace, i) => (
            <ToolRow key={trace.id} trace={trace} last={i === traces.length - 1} />
          ))}
        </ol>
      )}
    </section>
  );
```

(The inner `bg-muted/30 p-3` wrapper on the `<ol>` is removed — the card shell now provides the surface; `ml-1` keeps the rail off the card edge. `ToolRow`/`ToolDetail` are unchanged. Update the closing tag from `</div>` to `</section>`.)

- [ ] **Step 3: Artifacts card → card shell + count chip (artifacts-card.tsx)**

Replace the returned JSX (lines ~17-36):

```tsx
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
          {t("artifactsHeading")}
        </h2>
        {artifacts.length > 0 ? (
          <StatusChip variant="success">{artifacts.length}</StatusChip>
        ) : null}
      </div>
      {artifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyArtifacts")}</p>
      ) : (
        <div className="space-y-2">
          {artifacts.map((a) => (
            <ArtifactButton
              key={a.id}
              artifact={a}
              updatedAtLabel={formatRelativeTime(a.updatedAt, locale)}
            />
          ))}
        </div>
      )}
    </section>
  );
```

Add the import: `import { StatusChip } from "@ash/ui/status-chip";`. Note the outer `pb-8` on the old wrapper is dropped (the workspace container handles bottom spacing); if extra scroll breathing room is wanted keep it on the `<section>`.

- [ ] **Step 4: Drop inter-card separators (workbench-workspace.tsx)**

In `workbench-workspace.tsx`, the cards are now self-contained surfaces, so remove the `<Separator />` lines between them (lines ~27, ~29) and the now-unused import (line ~3). The container `space-y-4` already spaces the cards:

```tsx
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <PlanCard steps={active.plan} />
          <ToolsCard traces={active.toolTraces} />
          <ArtifactsCard locale={locale} artifacts={active.artifacts} />
        </div>
      </ScrollArea>
```

Remove `import { Separator } from "@ash/ui/separator";` from the top of the file.

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: no errors (watch for the removed `Separator` import — ensure no other usage remains in the file).

- [ ] **Step 6: Manual visual verification**

Run: `pnpm --filter web dev`, open a task with plan steps + tool traces + an artifact. Confirm in BOTH themes: three distinct bordered cards on the workspace canvas; plan header shows a `done/total` chip (running variant while in progress); artifacts header shows a count chip; tool timeline still renders with status nodes and expandable detail; no double-surface (card-inside-card) look.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/workbench/workspace/
git commit -m "feat(workbench): workspace cards — shared card shell + status chips"
```

---

### Task 5: Sidebar CTA emphasis

The only structural sidebar delta (the rest inherits the palette). Promote the "新建任务" button to ink.

**Files:**
- Modify: `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx:182-187`

- [ ] **Step 1: Promote the CTA to ink**

Change the expanded new-task `<Button>` from `variant="pill"` to `variant="default"`:

```tsx
          <Button variant="default" size="sm" className="w-full justify-center gap-2" asChild>
            <Link href="/app">
              <Plus className="size-4" aria-hidden />
              {t("newTask")}
            </Link>
          </Button>
```

- [ ] **Step 2: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: no errors.

- [ ] **Step 3: Manual visual verification**

Run dev, confirm the sidebar "新建任务" button is now ink (`bg-primary`) and the active-row ink rail still reads correctly against it in both themes (the CTA and active rail share the ink token — confirm they don't visually compete; if they do, note for review, do not change tokens here).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx
git commit -m "feat(workbench): ink primary CTA in sidebar"
```

---

### Task 6: Documentation & governance

Update the normative docs to the shipped values (REV-1, ADR-0013/0014, CLAUDE.md rule 5). Use the FINAL hex values from Task 1 (if any shifted to pass the gate, reflect those, not this plan's candidates).

**Files:**
- Modify: `docs/design-guidelines.md` (version bump + aesthetic table + any rule examples citing old hex)
- Modify: `docs/adr/0014-ash-native-identity.md` (amendment note)
- Modify: `docs/components/workbench-chat.md`, `docs/components/workbench-sidebar.md`, `docs/components/workbench-workspace.md`

- [ ] **Step 1: Design-guidelines MAJOR rev**

In `docs/design-guidelines.md`: bump the version (MAJOR — foundation tokens moved) and its changelog/revision appendix; update the "Current Aesthetic" token table to the Neutral Stone values from Task 1 (both themes); update any rule example that quotes an old hex (e.g. `#2a2825` → `#1c1c1a`, `#f7f6f4` → `#f5f5f4`). Add a one-line note that `StatusChip` joins `StatusDot` as a status presentation primitive (IMPL-7).

- [ ] **Step 2: ADR-0014 amendment note**

Append an "Amendment (2026-06): Neutral Stone ramp" section to `docs/adr/0014-ash-native-identity.md` recording: workbench neutral ramp moved from warm-beige to near-neutral stone + deeper ink for a modern/premium posture; rationale; explicitly notes ember + status hues unchanged so this is a ramp retune, not a new brand posture (no new saturated hue, PRIN-3 not triggered).

- [ ] **Step 3: Component docs**

Update each component doc to the new vocabulary:
- `workbench-chat.md`: ink user bubble (asymmetric radius), assistant role label, hairline turn dividers, ink send button.
- `workbench-sidebar.md`: ink primary CTA (note the rest unchanged).
- `workbench-workspace.md`: cards now use the shared card shell + `StatusChip` headers (plan progress, artifact count); separators removed; note timeline/playback + real deliverable preview/download remain deferred to sub-project A.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: record Neutral Stone ramp + component vocabulary (guidelines MAJOR, ADR-0014 amendment)"
```

---

### Task 7: Final verification gate

**Files:** none (verification only).

- [ ] **Step 1: Full check suite**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green. (`pnpm test` runs the StatusChip test + all existing suites — reducer/projection/tool-trace must still pass since no logic changed.)

- [ ] **Step 2: Contrast gate**

Run: `cd apps/web && node scripts/check-contrast.mjs`
Expected: `All pairs meet WCAG AA.` Paste the output into the PR description.

- [ ] **Step 3: Manual cross-pane verification**

Run dev. In BOTH light and dark, walk all three panes: sidebar (rows, dots, active rail, ink CTA), chat (ink bubble, role label, dividers, composer), workspace (three cards, chips, timeline). Confirm no leftover warm-beige surfaces, no contrast issues, no card-in-card. Smoke marketing + auth zones (they share neutrals; ember unchanged). Confirm `prefers-reduced-motion` path.

- [ ] **Step 4: Capture before/after screenshots**

Capture chat, sidebar, workspace in both themes; attach to the PR (visual regression is manual for this pass per spec).

- [ ] **Step 5: Open the PR**

Push the branch and open a PR titled `feat(workbench): visual/UX system pass — Neutral Stone + component vocabulary`, body summarizing the change, linking the spec + this plan, pasting the contrast-gate output, and noting deferred items (timeline/playback, real deliverable preview/download, composer attachments → sub-project A). Request design review per REV-1 (cite rule IDs).

---

## Self-Review

**Spec coverage:**
- Neutral Stone palette (both themes, AA gate) → Task 1. ✓
- StatusChip primitive → Task 2. ✓
- Chat: ink user bubble, role label, turn dividers, ink send → Task 3. ✓ (data inset + composer attach deferred per refined spec.)
- Workspace: card shell, status chips, plan/tools/artifacts restyle, separators removed → Task 4. ✓ (download/preview deferred per refined spec.)
- Sidebar: ink CTA (only real delta; rest pre-existing) → Task 5. ✓
- Governance: guidelines MAJOR, ADR-0014 amendment, component docs → Task 6. ✓
- Testing/verification: lint/typecheck/test/build + contrast gate + manual both themes + reduced motion → Task 7. ✓
- Cross-cutting (spacing/typography/motion/states): folded into the per-pane tasks using existing scales; no new primitives needed. ✓

**Placeholder scan:** none — every code step shows full code; manual-verification steps list exact observations, not "verify it looks good" hand-waves.

**Type consistency:** `StatusChip` prop shape (`variant: running|success|warning|neutral`) defined in Task 2 and consumed with those exact variant names in Task 4. Token names unchanged across tasks. `roleAssistant` key added in Task 3 and used in the same task.

**Note on TDD scope:** only Task 2 (a logic-bearing primitive) carries unit tests; the rest are pure-visual and are verified by build + the automated contrast gate + manual review in both themes. This is deliberate and matches the spec's "visual regression is manual for this pass" decision — not a placeholder.
