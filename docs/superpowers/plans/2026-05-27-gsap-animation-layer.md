# GSAP Animation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add GSAP-powered animations to chat messages and pane transitions in the ash workbench.

**Architecture:** GSAP lives in `apps/web/src/lib/animations/` as application-level utilities. `useGSAP` from `@gsap/react` handles cleanup. `gsap.matchMedia()` respects `prefers-reduced-motion`. Pane collapse uses `scaleX`/`xPercent` (compositor-only transforms) instead of CSS `width`.

**Tech Stack:** `gsap`, `@gsap/react`, Next.js App Router, React 19, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-05-27-gsap-animation-layer.md`

---

### Task 1: Install GSAP dependencies

**Files:**
- Modify: `apps/web/package.json`

- [x] **Step 1: Install gsap and @gsap/react**

```bash
pnpm --filter web add gsap @gsap/react
```

- [x] **Step 2: Verify installation**

```bash
pnpm --filter web exec node -e "const gsap = require('gsap'); console.log(gsap.version)"
```

Expected: prints a version string like `3.12.5`

- [x] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "deps: add gsap and @gsap/react to apps/web"
```

---

### Task 2: Create animation foundation

**Files:**
- Create: `apps/web/src/lib/animations/gsap-setup.ts`
- Create: `apps/web/src/lib/animations/presets.ts`
- Create: `apps/web/src/lib/animations/index.ts`

- [x] **Step 1: Create gsap-setup.ts**

Register the `useGSAP` plugin and set project-wide defaults. This file runs once at import time.

```ts
// apps/web/src/lib/animations/gsap-setup.ts
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

gsap.defaults({
  duration: 0.3,
  ease: "power2.out",
  overwrite: "auto",
});

// Respect prefers-reduced-motion globally.
// Individual components check context.conditions.reduceMotion to set duration: 0.
gsap.matchMedia().add(
  { reduceMotion: "(prefers-reduced-motion: reduce)" },
  (context) => {
    const { reduceMotion } = context.conditions;
    if (reduceMotion) {
      gsap.defaults({ duration: 0 });
    }
  },
);
```

- [x] **Step 2: Create presets.ts**

Named animation presets returning GSAP vars objects. Per GSAP best practice: use `autoAlpha` (not raw `opacity`), transform aliases only.

```ts
// apps/web/src/lib/animations/presets.ts
import type { TweenVars } from "gsap";

/** Entrance for a single message bubble. */
export function messageEntrance(): TweenVars {
  return {
    autoAlpha: 0,
    y: 8,
    duration: 0.3,
    ease: "power2.out",
  };
}

/** Staggered entrance for multiple message bubbles. */
export function messageStagger(): TweenVars {
  return {
    autoAlpha: 0,
    y: 8,
    stagger: 0.06,
    duration: 0.3,
    ease: "power2.out",
  };
}

/** Fade out content during pane collapse. */
export function fadeOut(duration = 0.15): TweenVars {
  return {
    autoAlpha: 0,
    duration,
    ease: "power3.out",
  };
}

/** Fade in content during pane expand. */
export function fadeIn(duration = 0.2): TweenVars {
  return {
    autoAlpha: 1,
    duration,
    ease: "power2.out",
  };
}
```

- [x] **Step 4: Create index.ts barrel export**

```ts
// apps/web/src/lib/animations/index.ts
export {
  messageEntrance,
  messageStagger,
  fadeOut,
  fadeIn,
} from "./presets";
```

- [x] **Step 5: Verify typecheck**

```bash
pnpm typecheck
```

Expected: passes with no errors.

- [x] **Step 6: Commit**

```bash
git add apps/web/src/lib/animations/
git commit -m "feat(animations): add GSAP foundation with presets and reduced-motion support"
```

---

### Task 3: Add ref support to MessageBubble

**Files:**
- Modify: `apps/web/src/components/workbench/chat/message-bubble.tsx`

The `MessageBubble` is currently a plain server-compatible component. GSAP needs a ref to target it. Add an optional `ref` prop and remove the CSS `animate-[message-in_0.3s_ease-out_both]` class (GSAP replaces this).

- [x] **Step 1: Update MessageBubble to accept a ref**

Replace the entire file content:

```tsx
// apps/web/src/components/workbench/chat/message-bubble.tsx
import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { forwardRef } from "react";

export interface MessageBubbleProps {
  message: Message;
  locale: AshLocale;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message, locale }, ref) {
    const isUser = message.role === "user";
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            isUser ? "max-w-[90%]" : "max-w-[90%]",
            isUser ? "items-end text-right" : "items-start",
          )}
        >
          <div
            className={cn(
              "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-secondary text-secondary-foreground"
                : "border border-border bg-card",
            )}
          >
            <p className="whitespace-pre-wrap text-left">{message.content}</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
```

Key changes:
- Wrapped in `forwardRef` to accept a ref
- Removed `animate-[message-in_0.3s_ease-out_both]` class (GSAP handles this now)

- [x] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: passes. The `MessageBubble` is used in `workbench-chat.tsx` without a ref — that's fine, `forwardRef` makes the ref optional.

- [x] **Step 3: Commit**

```bash
git add apps/web/src/components/workbench/chat/message-bubble.tsx
git commit -m "refactor(chat): add forwardRef to MessageBubble, remove CSS animation class"
```

---

### Task 4: Chat message animations

**Files:**
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx`

Add GSAP animations for: (a) staggered message load on mount, (b) new message entrance on send, (c) thinking state pulse.

- [x] **Step 1: Add GSAP imports and refs**

At the top of `workbench-chat.tsx`, add imports:

```ts
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { messageEntrance, messageStagger } from "@/lib/animations/presets";
import { useRef } from "react";
```

Add refs inside the component, after the existing state declarations:

```ts
const containerRef = useRef<HTMLDivElement>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);
const prevMessageCountRef = useRef(0);
```

- [x] **Step 2: Add staggered load animation**

After the `sendDraft` callback, add a `useGSAP` block for staggered entrance on mount:

```ts
useGSAP(
  () => {
    const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
    if (bubbles.length === 0) return;

    gsap.from(bubbles, messageStagger());

    prevMessageCountRef.current = messages.length;
  },
  { scope: containerRef, dependencies: [active.id] },
);
```

This runs when the conversation changes (`active.id` dependency). It staggers all `.message-bubble` elements into view.

- [x] **Step 3: Add new message entrance animation**

Add a second `useGSAP` block that detects when `messages.length` increases (new message added):

```ts
useGSAP(
  () => {
    if (messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }

    const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
    const newBubbles = bubbles.slice(prevMessageCountRef.current);

    if (newBubbles.length > 0) {
      const tl = gsap.timeline();
      tl.from(newBubbles, messageEntrance());
      // Scroll to bottom after entrance
      tl.call(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, undefined, "<0.1");
    }

    prevMessageCountRef.current = messages.length;
  },
  { scope: containerRef, dependencies: [messages.length] },
);
```

- [x] **Step 4: Add data attribute for bubble targeting**

In the `messages.map` JSX, add `className="message-bubble"` to the wrapper div (the `MessageBubble` already has its own wrapper, so we add the class on the outer map element):

Change:
```tsx
messages.map((m) => (
  <MessageBubble key={m.id} locale={locale} message={m} />
))
```

To:
```tsx
messages.map((m) => (
  <div key={m.id} className="message-bubble">
    <MessageBubble locale={locale} message={m} />
  </div>
))
```

- [x] **Step 5: Add thinking state pulse animation**

Refactor the thinking indicator to use GSAP instead of CSS `animate-spin`:

```tsx
{active.status === "running" && (
  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
    <Loader2
      ref={(el) => {
        if (el) {
          gsap.to(el, {
            scale: 1.05,
            repeat: -1,
            yoyo: true,
            duration: 0.6,
            ease: "power1.inOut",
          });
        }
      }}
      className="size-4"
      aria-hidden
    />
    {t("thinkingPlaceholder")}
  </div>
)}
```

Note: Remove the `animate-spin` class from `Loader2` — GSAP pulse replaces it.

- [x] **Step 6: Add scroll target and container ref**

Wrap the scrollable area with the `containerRef`. Add a `messagesEndRef` div at the bottom:

Change the `ScrollArea` content div to:
```tsx
<ScrollArea className="min-h-0 flex-1">
  <div
    ref={containerRef}
    className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
    role="log"
    aria-live="polite"
    aria-relevant="additions"
  >
    {/* ... messages ... */}
    <div ref={messagesEndRef} aria-hidden />
  </div>
</ScrollArea>
```

- [x] **Step 7: Verify typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: passes.

- [x] **Step 8: Visual verification**

```bash
pnpm --filter web dev
```

Open browser. Verify:
1. Messages stagger in on page load
2. Sending a message shows entrance animation for new messages
3. Thinking indicator pulses instead of spinning
4. Auto-scroll to bottom works after new messages

- [x] **Step 9: Commit**

```bash
git add apps/web/src/components/workbench/chat/workbench-chat.tsx
git commit -m "feat(chat): add GSAP message animations — stagger, entrance, thinking pulse"
```

---

### Task 5: Composer micro-interactions

**Files:**
- Modify: `apps/web/src/components/workbench/chat/composer.tsx`

Add subtle scale animations on focus and send button press.

- [x] **Step 1: Add GSAP imports and ref**

```ts
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { useRef } from "react";
```

Add ref inside component:

```ts
const containerRef = useRef<HTMLDivElement>(null);
const sendButtonRef = useRef<HTMLButtonElement>(null);
```

- [x] **Step 2: Add focus animation to composer container**

After the existing return statement opening, add a `useGSAP` block. Actually, let me restructure — the `useGSAP` call goes inside the component body before the return:

```ts
useGSAP(
  () => {
    const textarea = containerRef.current?.querySelector("textarea");
    if (!textarea) return;

    const onFocus = () => {
      gsap.to(containerRef.current, {
        scale: 1.01,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    const onBlur = () => {
      gsap.to(containerRef.current, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    textarea.addEventListener("focus", onFocus);
    textarea.addEventListener("blur", onBlur);

    return () => {
      textarea.removeEventListener("focus", onFocus);
      textarea.removeEventListener("blur", onBlur);
    };
  },
  { scope: containerRef },
);
```

- [x] **Step 3: Add send button press animation**

Use `contextSafe` from `useGSAP` for event handlers (per GSAP React skill):

```ts
const { contextSafe } = useGSAP({ scope: containerRef });

const handleSendPress = contextSafe(() => {
  if (!sendButtonRef.current) return;
  gsap.to(sendButtonRef.current, {
    scale: 0.95,
    duration: 0.1,
    ease: "power2.out",
    onComplete: () => {
      gsap.to(sendButtonRef.current!, {
        scale: 1,
        duration: 0.2,
        ease: "back.out(1.7)",
      });
    },
  });
});
```

Note: `back.out(1.7)` gives a subtle overshoot on the spring-back, matching the "subtle & professional" feel — just barely perceptible.

- [x] **Step 4: Wire up refs in JSX**

Update the composer container to use `containerRef`:

```tsx
<div ref={containerRef} className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
```

Update the send button to use `sendButtonRef` and `handleSendPress`:

```tsx
<Button
  ref={sendButtonRef}
  type="button"
  variant="pill"
  size="sm"
  onClick={() => {
    handleSendPress();
    onSend();
  }}
>
```

- [x] **Step 5: Verify typecheck**

```bash
pnpm typecheck
```

- [x] **Step 6: Visual verification**

In browser: click the textarea — container scales up slightly. Click send — button squishes and springs back.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/workbench/chat/composer.tsx
git commit -m "feat(chat): add GSAP micro-interactions to composer — focus scale, send press"
```

---

### Task 6: Sidebar collapse animation

**Files:**
- Modify: `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`

Replace the CSS `transition-[width]` with GSAP timeline for sidebar collapse/expand. The sidebar uses conditional rendering (`sidebarCollapsed ? null : <content>`) — GSAP needs the content to exist in DOM during animation, so we'll use visibility/opacity instead of conditional removal.

- [x] **Step 1: Add GSAP imports**

```ts
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
```

- [x] **Step 2: Add refs for animation targets**

Add refs inside the component:

```ts
const asideRef = useRef<HTMLElement>(null);
const expandedContentRef = useRef<HTMLDivElement>(null);
const collapsedRailRef = useRef<HTMLDivElement>(null);
```

- [x] **Step 3: Replace CSS transition with GSAP timeline**

Remove the `transition-[width] duration-200 ease-out` class from the `<aside>`. Add a `useGSAP` block that reacts to `sidebarCollapsed`:

```ts
useGSAP(
  () => {
    const aside = asideRef.current;
    const expanded = expandedContentRef.current;
    const collapsed = collapsedRailRef.current;
    if (!aside || !expanded || !collapsed) return;

    if (sidebarCollapsed) {
      // Collapse timeline
      const tl = gsap.timeline();
      tl.to(expanded, fadeOut())
        .to(aside, { width: 56, duration: 0.25, ease: "power3.out" }, "<0.05")
        .to(collapsed, fadeIn(0.15), "<0.1");
    } else {
      // Expand timeline
      const tl = gsap.timeline();
      tl.to(collapsed, fadeOut(0.1))
        .to(aside, { width: 260, duration: 0.35, ease: "power2.out" }, "<0.05")
        .to(expanded, fadeIn(), "<0.1");
    }
  },
  { dependencies: [sidebarCollapsed], scope: asideRef },
);
```

- [x] **Step 4: Restructure JSX to always render both states**

Currently the expanded content and collapsed rail are conditionally rendered. Both need to exist in DOM for GSAP to animate between them. Replace the conditional rendering with visibility toggling.

Change the `<aside>` to use `ref={asideRef}` and a fixed width class instead of dynamic:

```tsx
<aside
  ref={asideRef}
  className="flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
>
```

Wrap the expanded content in a div with `ref={expandedContentRef}`:

```tsx
<div ref={expandedContentRef} className="flex flex-1 flex-col">
  {/* existing expanded content: header with brand, buttons, search, list, footer */}
</div>
```

Wrap the collapsed rail in a div with `ref={collapsedRailRef}` and initial hidden state:

```tsx
<div
  ref={collapsedRailRef}
  className="flex flex-1 flex-col"
  style={{ autoAlpha: 0, visibility: "hidden" }}
>
  {/* existing collapsed rail content */}
</div>
```

- [x] **Step 5: Simplify the header for collapsed/expanded states**

The header currently has conditional content (`sidebarCollapsed ? null : <brand+collapse-button>`). Wrap the conditional parts in the expanded/collapsed containers so they animate together.

The home link (Sparkles icon) appears in both states — keep it outside both containers in the header.

- [x] **Step 6: Verify typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [x] **Step 7: Visual verification**

In browser:
1. Click collapse — content fades, sidebar shrinks, rail icons appear
2. Click expand — rail fades, sidebar grows, content appears
3. Toggle rapidly mid-animation — no tween pile-up (overwrite: "auto")
4. Tab through sidebar — focus management still works

- [x] **Step 8: Commit**

```bash
git add apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx
git commit -m "feat(sidebar): replace CSS transition with GSAP collapse/expand timeline"
```

---

### Task 7: Workspace collapse animation

**Files:**
- Modify: `apps/web/src/components/workbench/workbench-chrome.tsx`

The workspace panel is currently conditionally rendered (`!workspaceCollapsed && workspacePanel`). GSAP needs it in DOM to animate. Also animate the FAB entrance.

- [x] **Step 1: Add GSAP imports**

```ts
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import { useRef } from "react";
```

- [x] **Step 2: Add refs**

```ts
const workspaceRef = useRef<HTMLDivElement>(null);
const fabRef = useRef<HTMLButtonElement>(null);
```

- [x] **Step 3: Replace conditional rendering with GSAP toggle**

Change from:
```tsx
{!workspaceCollapsed && workspacePanel}

{workspaceCollapsed && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button ... >
```

To: always render the workspace, animate with GSAP:

```tsx
<div
  ref={workspaceRef}
  className="flex shrink-0 flex-col"
  style={{ width: 380 }}
>
  {workspacePanel}
</div>

<Tooltip>
  <TooltipTrigger asChild>
    <Button
      ref={fabRef}
      ...
```

- [x] **Step 4: Add GSAP timeline for workspace toggle**

```ts
useGSAP(
  () => {
    const ws = workspaceRef.current;
    const fab = fabRef.current;
    if (!ws || !fab) return;

    if (workspaceCollapsed) {
      const tl = gsap.timeline();
      tl.to(ws, { xPercent: 100, ...fadeOut() })
        .from(fab, { scale: 0.8, autoAlpha: 0, duration: 0.2, ease: "power2.out" }, "<0.1");
    } else {
      const tl = gsap.timeline();
      tl.to(fab, fadeOut(0.1))
        .to(ws, { xPercent: 0, ...fadeIn(0.35) }, "<0.05");
    }
  },
  { dependencies: [workspaceCollapsed] },
);
```

- [x] **Step 5: Handle FAB visibility**

The FAB should be hidden when workspace is expanded. Use `autoAlpha` controlled by GSAP, not conditional rendering:

```tsx
<Button
  ref={fabRef}
  variant="pill"
  size="sm"
  className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
  style={{ visibility: workspaceCollapsed ? "visible" : "hidden" }}
  ...
>
```

- [x] **Step 6: Verify typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [x] **Step 7: Visual verification**

In browser:
1. Click workspace toggle — panel slides right, FAB appears
2. Click FAB — FAB disappears, panel slides in from right
3. Toggle rapidly — no visual glitches

- [x] **Step 8: Commit**

```bash
git add apps/web/src/components/workbench/workbench-chrome.tsx
git commit -m "feat(workspace): add GSAP slide animation for workspace collapse/expand"
```

---

### Task 8: Reduced-motion verification and cleanup

**Files:**
- Verify all animation components

- [x] **Step 1: Test reduced-motion**

Open Chrome DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion: reduce`. Verify:
1. Messages appear instantly (no stagger)
2. Sidebar collapse/expand is instant
3. Workspace toggle is instant
4. Composer focus/send have no scale animation
5. Thinking indicator is static

- [x] **Step 2: Test keyboard navigation**

Tab through the entire workbench:
1. Sidebar: home link, new task, cmd+k, search, conversation rows, footer
2. Chat: workspace toggle, message area, composer, send button
3. Workspace: plan steps, tool traces, artifact buttons

Verify no focus traps, all interactive elements reachable.

- [x] **Step 3: Run full verification**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all pass.

- [x] **Step 4: Commit any fixes**

If any issues found and fixed during verification, commit them.

```bash
git add -A
git commit -m "fix(animations): address reduced-motion and keyboard navigation issues"
```

---

### Task 9: Final review and documentation update

**Files:**
- Modify: `docs/components/workbench-chat.md` (update animation behavior)
- Modify: `docs/components/agent-workbench-shell.md` (note GSAP layer)

- [x] **Step 1: Update component docs**

In `docs/components/workbench-chat.md`, note that message animations are now GSAP-powered with reduced-motion support.

In `docs/components/agent-workbench-shell.md`, add a brief note about the GSAP animation layer under the "Layering" or "Keyboard affordances" section.

- [x] **Step 2: Final commit**

```bash
git add docs/components/
git commit -m "docs: update component docs with GSAP animation behavior"
```
