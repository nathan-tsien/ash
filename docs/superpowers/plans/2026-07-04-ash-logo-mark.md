# Ash Logo Mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled vector `LogoMark` for Ash's Companion Shadow + Task Core identity, wire it into the product brand chrome, and document the new signature.

**Architecture:** The logo mark lives in `packages/ui` as a presentational SVG primitive with semantic token fills only. `apps/web` consumes it in the workbench sidebar. Documentation records that the styled `ash.` wordmark remains valid and that the icon is an additive brand mark; static favicon/app-icon export is deferred until a token-safe asset pipeline is chosen.

**Tech Stack:** React 19, TypeScript strict, Next.js App Router, Vitest + Testing Library, Tailwind semantic tokens via CSS variables.

---

## File Structure

- Create `packages/ui/src/components/logo-mark.tsx`
  - Owns the vector mark only.
  - Exports `LogoMark`.
  - Does not import app code or domain types.
- Create `apps/web/src/__tests__/logo-mark.test.tsx`
  - Verifies the UI primitive's accessibility and token-based SVG parts from the web test runner.
- Modify `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`
  - Replaces the generic `Sparkles` sidebar home icon with `LogoMark`.
- Modify `apps/web/src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx`
  - Verifies the sidebar home link renders the Ash logo mark.
- Modify `docs/design-guidelines.md`
  - Updates PRIN-6 and changelog for the new logo-mark signature.
- Modify `docs/adr/0014-ash-native-identity.md`
  - Adds an amendment noting that the prior "no logo asset" phase is superseded by `LogoMark`.
- Modify `docs/components/workbench-sidebar.md`
  - Documents the sidebar logo link using `LogoMark`.

## Geometry Contract

The implementation must use this geometry unless a reviewer explicitly asks for revision:

```tsx
<path
  data-slot="logo-mark-shadow"
  d="M16 2.75C23.04 2.75 28.75 8.39 28.75 15.35C28.75 20.74 25.34 25.44 20.36 27.18L16 29L11.64 27.18C6.66 25.44 3.25 20.74 3.25 15.35C3.25 8.39 8.96 2.75 16 2.75Z"
  fill="currentColor"
/>
<path
  data-slot="logo-mark-core"
  d="M10.55 10.35H16.95L21.45 14.6V21.55C21.45 22.33 20.83 22.95 20.05 22.95H11.95C11.17 22.95 10.55 22.33 10.55 21.55V10.35Z"
  fill="var(--background)"
/>
<path
  data-slot="logo-mark-fold"
  d="M16.95 10.35V13.35C16.95 14.04 17.51 14.6 18.2 14.6H21.45"
  fill="none"
  stroke="currentColor"
  strokeLinecap="round"
  strokeLinejoin="round"
  strokeWidth="1.25"
/>
<circle
  data-slot="logo-mark-ember"
  cx="16"
  cy="17.35"
  r="1.85"
  fill="var(--ember)"
/>
```

This geometry encodes:

- Outer companion silhouette: charcoal/currentColor shell.
- Inner task core: semantic background-colored negative space with a fold.
- Ember point: semantic `--ember` accent.

No raw hex literals are allowed in application code or SVG assets.

### Task 1: Add Tested LogoMark Primitive

**Files:**
- Create: `apps/web/src/__tests__/logo-mark.test.tsx`
- Create: `packages/ui/src/components/logo-mark.tsx`

- [ ] **Step 1: Write the failing primitive test**

Create `apps/web/src/__tests__/logo-mark.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogoMark } from "@ash/ui/logo-mark";

describe("LogoMark", () => {
  it("is decorative by default", () => {
    const { container } = render(<LogoMark data-testid="ash-logo" />);

    const logo = screen.getByTestId("ash-logo");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(logo).not.toHaveAttribute("role");
    expect(container.querySelector('[data-slot="logo-mark-ember"]')).toBeInTheDocument();
  });

  it("is accessible when a title is provided", () => {
    render(<LogoMark title="Ash logo" />);

    const logo = screen.getByRole("img", { name: "Ash logo" });
    expect(logo).toHaveAttribute("data-slot", "logo-mark");
    expect(screen.getByText("Ash logo")).toBeInTheDocument();
  });

  it("uses semantic token fills for the core and ember", () => {
    const { container } = render(<LogoMark />);

    expect(container.querySelector('[data-slot="logo-mark-core"]')).toHaveAttribute(
      "fill",
      "var(--background)",
    );
    expect(container.querySelector('[data-slot="logo-mark-ember"]')).toHaveAttribute(
      "fill",
      "var(--ember)",
    );
  });
});
```

- [ ] **Step 2: Run the primitive test and verify RED**

Run:

```bash
pnpm --filter @ash/web test -- src/__tests__/logo-mark.test.tsx
```

Expected: FAIL because `@ash/ui/logo-mark` cannot be resolved.

- [ ] **Step 3: Add `LogoMark` implementation**

Create `packages/ui/src/components/logo-mark.tsx` with:

```tsx
import * as React from "react";

import { cn } from "../lib/utils";

export interface LogoMarkProps extends React.ComponentProps<"svg"> {
  /**
   * Accessible name for non-decorative use. Omit when adjacent visible brand
   * text, such as the Wordmark, already labels the mark.
   */
  title?: string;
}

function LogoMark({ className, title, ...props }: LogoMarkProps) {
  const accessibilityProps = title
    ? ({ role: "img" as const } satisfies React.SVGProps<SVGSVGElement>)
    : ({ "aria-hidden": true } satisfies React.SVGProps<SVGSVGElement>);

  return (
    <svg
      data-slot="logo-mark"
      viewBox="0 0 32 32"
      className={cn("size-6 shrink-0 text-foreground", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...accessibilityProps}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        data-slot="logo-mark-shadow"
        d="M16 2.75C23.04 2.75 28.75 8.39 28.75 15.35C28.75 20.74 25.34 25.44 20.36 27.18L16 29L11.64 27.18C6.66 25.44 3.25 20.74 3.25 15.35C3.25 8.39 8.96 2.75 16 2.75Z"
        fill="currentColor"
      />
      <path
        data-slot="logo-mark-core"
        d="M10.55 10.35H16.95L21.45 14.6V21.55C21.45 22.33 20.83 22.95 20.05 22.95H11.95C11.17 22.95 10.55 22.33 10.55 21.55V10.35Z"
        fill="var(--background)"
      />
      <path
        data-slot="logo-mark-fold"
        d="M16.95 10.35V13.35C16.95 14.04 17.51 14.6 18.2 14.6H21.45"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <circle
        data-slot="logo-mark-ember"
        cx="16"
        cy="17.35"
        r="1.85"
        fill="var(--ember)"
      />
    </svg>
  );
}

export { LogoMark };
```

- [ ] **Step 4: Run the primitive test and verify GREEN**

Run:

```bash
pnpm --filter @ash/web test -- src/__tests__/logo-mark.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run UI package typecheck**

Run:

```bash
pnpm --filter @ash/ui typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add apps/web/src/__tests__/logo-mark.test.tsx packages/ui/src/components/logo-mark.tsx
git commit -m "feat(ui): add ash logo mark primitive"
```

Expected: commit succeeds.

### Task 2: Wire LogoMark Into Sidebar Brand Chrome

**Files:**
- Modify: `apps/web/src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx`
- Modify: `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`

- [ ] **Step 1: Write the failing sidebar integration test**

In `apps/web/src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx`, add this mock near the Wordmark mock:

```tsx
vi.mock("@ash/ui/logo-mark", () => ({
  LogoMark: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="ash-logo-mark" {...props} />
  ),
}));
```

Then add this test before the `A1` section:

```tsx
describe("brand chrome", () => {
  it("uses the Ash logo mark for the sidebar home link", () => {
    render(<WorkbenchSidebar {...BASE_PROPS} />);

    const homeLink = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("aria-label")?.includes("sidebarHomeAria"));

    expect(homeLink).toBeDefined();
    expect(homeLink?.querySelector('[data-testid="ash-logo-mark"]')).toBeInTheDocument();
    expect(homeLink?.querySelector('[data-testid="sparkles"]')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run sidebar test and verify RED**

Run:

```bash
pnpm --filter @ash/web test -- src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx
```

Expected: FAIL because the home link still renders the `Sparkles` icon.

- [ ] **Step 3: Replace `Sparkles` with `LogoMark`**

In `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`:

1. Remove `Sparkles` from the `lucide-react` import.
2. Add:

```tsx
import { LogoMark } from "@ash/ui/logo-mark";
```

3. Replace:

```tsx
<Sparkles className="size-[18px]" aria-hidden />
```

with:

```tsx
<LogoMark className="size-[22px]" />
```

Do not change the `Link`, tooltip, or aria label. The adjacent tooltip and link label already name the destination, so the icon remains decorative.

- [ ] **Step 4: Run sidebar test and verify GREEN**

Run:

```bash
pnpm --filter @ash/web test -- src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add apps/web/src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx
git commit -m "feat(web): use ash logo mark in sidebar"
```

Expected: commit succeeds.

### Task 3: Document LogoMark Signature

**Files:**
- Modify: `docs/design-guidelines.md`
- Modify: `docs/adr/0014-ash-native-identity.md`
- Modify: `docs/components/workbench-sidebar.md`
- Modify: `docs/superpowers/specs/2026-07-04-ash-logo-direction-design.md`

- [ ] **Step 1: Update PRIN-6 signature registry**

In `docs/design-guidelines.md`, change the PRIN-6 table row:

```markdown
| Ember mark | Wordmark "ash." ember period + marketing accents | Cultivate within COLOR-10 scope |
```

to:

```markdown
| Ember mark | Wordmark "ash." ember period, LogoMark ember point, marketing accents | Cultivate within COLOR-10 scope |
```

Then add this row immediately after it:

```markdown
| Companion Shadow LogoMark | `LogoMark` icon in `@ash/ui`, sidebar home mark, future favicon/app icon source | Cultivate; vector-only, no hand/face/generic AI icon |
```

Append this changelog row after `v2.0.0`:

```markdown
| v2.1.0 | 2026-07-04 | MINOR — Ash LogoMark signature added: Companion Shadow + Task Core vector mark introduced in `@ash/ui`, sidebar brand chrome updated, PRIN-6 registry extended; styled `ash.` wordmark remains valid. |
```

- [ ] **Step 2: Update ADR-0014 amendment**

Append this section to `docs/adr/0014-ash-native-identity.md`:

```markdown
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
app icon export remain deferred until a token-safe asset pipeline is chosen.

**Constraints.** The mark remains vector-only, token-colored, and brand-scoped. It must not
use a hand, face, mascot, eye, shield, house, generic AI sparkle, or letter-A dependency.
Ember remains limited to brand expression per COLOR-10.

**Unchanged:** Ash & Ember palette, Neutral Stone ramp, workbench chrome discipline,
three-pane IA, display-type scope, and existing wordmark semantics.
```

- [ ] **Step 3: Update sidebar component docs**

In `docs/components/workbench-sidebar.md`, change:

```markdown
- **Logo link**: `Sparkles` icon in a `size-10` rounded button, navigates to `/` (marketing). Visible in both expanded and collapsed states.
```

to:

```markdown
- **Logo link**: `LogoMark` from `@ash/ui/logo-mark` in a `size-10` rounded button, navigates to `/` (marketing). The icon is decorative because the link's aria label names the destination. Visible in both expanded and collapsed states.
```

- [ ] **Step 4: Update implementation spec status**

In `docs/superpowers/specs/2026-07-04-ash-logo-direction-design.md`, change:

```markdown
- Status: Draft for stakeholder review
```

to:

```markdown
- Status: Approved for implementation
```

Then add this sentence after the Decision section's paragraph ending `hand-built as vector geometry.`:

```markdown
Implementation landed as `LogoMark` in `packages/ui/src/components/logo-mark.tsx`; static favicon/app-icon export is deferred to a token-safe asset pipeline.
```

- [ ] **Step 5: Verify docs mention LogoMark consistently**

Run:

```bash
rg -n "Sparkles icon|no logo asset this phase|LogoMark|Companion Shadow" docs/design-guidelines.md docs/adr/0014-ash-native-identity.md docs/components/workbench-sidebar.md docs/superpowers/specs/2026-07-04-ash-logo-direction-design.md
```

Expected:

- No `Sparkles icon` match in `docs/components/workbench-sidebar.md`.
- `LogoMark` matches in all four files.
- `no logo asset this phase` may still appear as historical context only if followed by the 2026-07 amendment.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add docs/design-guidelines.md docs/adr/0014-ash-native-identity.md docs/components/workbench-sidebar.md docs/superpowers/specs/2026-07-04-ash-logo-direction-design.md
git commit -m "docs: record ash logo mark signature"
```

Expected: commit succeeds.

### Task 4: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --filter @ash/web test -- src/__tests__/logo-mark.test.tsx src/components/workbench/sidebar/__tests__/workbench-sidebar.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typechecks**

Run:

```bash
pnpm --filter @ash/ui typecheck
pnpm --filter @ash/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint for impacted packages**

Run:

```bash
pnpm --filter @ash/ui lint
pnpm --filter @ash/web lint
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -5
```

Expected:

- Working tree has no tracked unstaged changes.
- Unrelated pre-existing untracked files, such as `.claire/`, may remain untracked.
- Recent commits include the three implementation/doc commits from this plan.
