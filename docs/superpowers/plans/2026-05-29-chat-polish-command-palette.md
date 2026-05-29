# Chat Polish + Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the workbench Chat pane from plain-text to markdown-rendered messages with copy buttons, auto-resizing composer, scroll-to-bottom, and a functional Cmd+K command palette.

**Architecture:** Chat polish modifies existing components in `apps/web/src/components/workbench/chat/`. Command palette adds a new provider + component following the `SettingsModalProvider` pattern. All new dependencies go in `apps/web/package.json` only.

**Tech Stack:** react-markdown, rehype-highlight, remark-gfm, highlight.js, cmdk, GSAP (existing), Radix Dialog (existing)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/package.json` | Modify | Add 5 new dependencies |
| `chat/message-bubble.tsx` | Modify | Markdown rendering + copy button |
| `chat/composer.tsx` | Modify | Auto-resize + Enter-to-send |
| `chat/workbench-chat.tsx` | Modify | Scroll-to-bottom button |
| `chat/scroll-to-bottom.tsx` | Create | Floating scroll-to-bottom button |
| `command-palette/command-palette-provider.tsx` | Create | Context provider for palette state |
| `command-palette/command-palette.tsx` | Create | cmdk-based command palette UI |
| `workbench-chrome.tsx` | Modify | Wrap with CommandPaletteProvider, add global Cmd+K |
| `sidebar/workbench-sidebar.tsx` | Modify | Wire Cmd+K button to palette |
| `messages/en.json` | Modify | Add CommandPalette namespace + chat strings |
| `messages/zh.json` | Modify | Add CommandPalette namespace + chat strings |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add dependencies**

Add to `apps/web/package.json` `dependencies`:

```json
"cmdk": "^1.0.4",
"react-markdown": "^9.0.0",
"rehype-highlight": "^7.0.0",
"remark-gfm": "^4.0.0",
"highlight.js": "^11.10.0"
```

- [ ] **Step 2: Install**

Run: `pnpm install`

Expected: Lockfile updated, no peer dependency warnings.

- [ ] **Step 3: Verify build still passes**

Run: `pnpm build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "deps: add cmdk, react-markdown, rehype-highlight, remark-gfm, highlight.js"
```

---

### Task 2: i18n — Add All New Translation Keys

**Files:**
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/zh.json`

Do this first so all subsequent tasks can reference i18n keys immediately.

- [ ] **Step 1: Add keys to en.json**

In `apps/web/messages/en.json`, update the `Workbench` section — change these keys:

```json
"shortcutHint": "Enter send · Shift+Enter newline",
"commandPaletteAria": "Open command palette",
"commandPaletteTooltip": "Command palette",
```

Add these new keys at the end of the `Workbench` section:

```json
"copyMessage": "Copy message",
"copiedMessage": "Copied!",
"scrollToBottom": "Scroll to bottom"
```

Add a new top-level `CommandPalette` section after `Workbench`:

```json
"CommandPalette": {
  "placeholder": "Type a command…",
  "noResults": "No results found",
  "groupNavigation": "Navigation",
  "groupActions": "Actions",
  "switchConversation": "Switch conversation",
  "newConversation": "New conversation",
  "openSettings": "Open settings",
  "toggleWorkspace": "Toggle workspace",
  "goHome": "Go home"
}
```

- [ ] **Step 2: Add keys to zh.json**

In `apps/web/messages/zh.json`, update the `Workbench` section — change these keys:

```json
"shortcutHint": "Enter 发送 · Shift+Enter 换行",
"commandPaletteAria": "打开命令面板",
"commandPaletteTooltip": "命令面板",
```

Add these new keys at the end of the `Workbench` section:

```json
"copyMessage": "复制消息",
"copiedMessage": "已复制",
"scrollToBottom": "回到底部"
```

Add a new top-level `CommandPalette` section after `Workbench`:

```json
"CommandPalette": {
  "placeholder": "输入命令…",
  "noResults": "未找到结果",
  "groupNavigation": "导航",
  "groupActions": "操作",
  "switchConversation": "切换会话",
  "newConversation": "新建会话",
  "openSettings": "打开设置",
  "toggleWorkspace": "切换工作台",
  "goHome": "回到首页"
}
```

- [ ] **Step 3: Verify i18n check passes**

Run: `pnpm lint`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/messages/en.json apps/web/messages/zh.json
git commit -m "i18n: add command palette and chat polish translation keys"
```

---

### Task 3: Markdown Rendering in MessageBubble

**Files:**
- Modify: `apps/web/src/components/workbench/chat/message-bubble.tsx`

- [ ] **Step 1: Update MessageBubble with markdown rendering**

Replace the entire contents of `apps/web/src/components/workbench/chat/message-bubble.tsx`:

```tsx
import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

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
            {isUser ? (
              <p className="whitespace-pre-wrap text-left">{message.content}</p>
            ) : (
              <div className="prose-chat text-left">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    pre: ({ children, ...props }) => (
                      <pre className="relative" {...props}>
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
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

- [ ] **Step 2: Add prose styles to globals.css**

In `packages/ui/src/globals.css`, add these styles after the existing keyframes (before the closing of the file):

```css
/* Chat markdown prose styles */
.prose-chat {
  font-size: inherit;
  line-height: inherit;
}
.prose-chat p {
  margin: 0;
}
.prose-chat p + p {
  margin-top: 0.5em;
}
.prose-chat ul,
.prose-chat ol {
  margin: 0.25em 0;
  padding-left: 1.5em;
}
.prose-chat li {
  margin: 0.15em 0;
}
.prose-chat code {
  background: var(--muted);
  padding: 0.15em 0.35em;
  border-radius: var(--radius-sm);
  font-size: 0.875em;
  font-family: var(--font-mono);
}
.prose-chat pre {
  margin: 0.5em 0;
  padding: 0.75em 1em;
  background: var(--muted);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.prose-chat pre code {
  background: none;
  padding: 0;
  font-size: 0.8125em;
}
.prose-chat a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.prose-chat a:hover {
  opacity: 0.8;
}
.prose-chat blockquote {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 3px solid var(--border);
  color: var(--muted-foreground);
}
.prose-chat table {
  margin: 0.5em 0;
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875em;
}
.prose-chat th,
.prose-chat td {
  padding: 0.35em 0.75em;
  border: 1px solid var(--border);
  text-align: left;
}
.prose-chat th {
  background: var(--muted);
  font-weight: 600;
}
.prose-chat strong {
  font-weight: 600;
}
.prose-chat em {
  font-style: italic;
}
```

- [ ] **Step 3: Import highlight.js theme**

In `apps/web/src/components/workbench/chat/message-bubble.tsx`, add at the top of the file (after the existing imports):

```tsx
import "highlight.js/styles/github-dark.css";
```

- [ ] **Step 4: Verify build**

Run: `pnpm typecheck && pnpm build`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/workbench/chat/message-bubble.tsx packages/ui/src/globals.css
git commit -m "feat(chat): render assistant messages as markdown with syntax highlighting"
```

---

### Task 4: Message Copy Button

**Files:**
- Modify: `apps/web/src/components/workbench/chat/message-bubble.tsx`

- [ ] **Step 1: Add copy button to MessageBubble**

Replace the entire contents of `apps/web/src/components/workbench/chat/message-bubble.tsx`:

```tsx
import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import "highlight.js/styles/github-dark.css";

export interface MessageBubbleProps {
  message: Message;
  locale: AshLocale;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message, locale }, ref) {
    const isUser = message.role === "user";
    const t = useTranslations("Workbench");
    const [copied, setCopied] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleCopy = useCallback(async () => {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);

      // GSAP bounce animation
      if (buttonRef.current) {
        gsap.to(buttonRef.current, {
          scale: 0.85,
          duration: 0.1,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(buttonRef.current!, {
              scale: 1,
              duration: 0.25,
              ease: "back.out(1.7)",
            });
          },
        });
      }

      setTimeout(() => setCopied(false), 2000);
    }, [message.content]);

    return (
      <div
        ref={ref}
        className={cn(
          "group/bubble flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "relative",
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
            {isUser ? (
              <p className="whitespace-pre-wrap text-left">{message.content}</p>
            ) : (
              <div className="prose-chat text-left">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    pre: ({ children, ...props }) => (
                      <pre className="relative" {...props}>
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {/* Copy button — appears on hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={buttonRef}
                variant="ghost"
                size="icon"
                type="button"
                className="absolute -right-2 -top-2 size-7 rounded-lg opacity-0 shadow-sm transition-opacity group-hover/bubble:opacity-100"
                aria-label={t("copyMessage")}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3.5 text-green-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {copied ? t("copiedMessage") : t("copyMessage")}
            </TooltipContent>
          </Tooltip>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
```

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck && pnpm build`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workbench/chat/message-bubble.tsx
git commit -m "feat(chat): add hover-reveal copy button on message bubbles"
```

---

### Task 5: Composer Auto-Resize + Enter-to-Send

**Files:**
- Modify: `apps/web/src/components/workbench/chat/composer.tsx`

- [ ] **Step 1: Update Composer**

Replace the entire contents of `apps/web/src/components/workbench/chat/composer.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@ash/ui/button";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import "@/lib/animations/gsap-setup";

export interface ComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function Composer({ draft, onDraftChange, onSend }: ComposerProps) {
  const t = useTranslations("Workbench");
  const containerRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [draft]);

  // Focus animation on textarea
  useEffect(() => {
    const container = containerRef.current;
    const textarea = container?.querySelector("textarea");
    if (!container || !textarea) return;

    const ctx = gsap.context(() => {
      const onFocus = () => {
        gsap.to(container, { scale: 1.01, duration: 0.2, ease: "power2.out" });
      };
      const onBlur = () => {
        gsap.to(container, { scale: 1, duration: 0.2, ease: "power2.out" });
      };

      textarea.addEventListener("focus", onFocus);
      textarea.addEventListener("blur", onBlur);

      return () => {
        textarea.removeEventListener("focus", onFocus);
        textarea.removeEventListener("blur", onBlur);
      };
    }, container);

    return () => ctx.revert();
  }, []);

  // Send button press animation
  const handleSendPress = useCallback(() => {
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
  }, []);

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div
          ref={containerRef}
          className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
        >
          <textarea
            ref={textareaRef}
            className="max-h-[168px] min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            placeholder={t("textareaPlaceholder")}
            value={draft}
            aria-label={t("textareaAria")}
            aria-multiline="true"
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">{t("shortcutHint")}</p>
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
            {t("send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Key changes:
1. Added `textareaRef` for direct DOM access
2. Added auto-resize `useEffect` that resets height to `auto` then caps at `168px`
3. Changed `onKeyDown` from `Cmd+Enter` to `Enter` (without shift)

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck && pnpm build`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workbench/chat/composer.tsx
git commit -m "feat(chat): auto-resize composer textarea, Enter to send"
```

---

### Task 6: Scroll-to-Bottom Button

**Files:**
- Create: `apps/web/src/components/workbench/chat/scroll-to-bottom.tsx`
- Modify: `apps/web/src/components/workbench/chat/workbench-chat.tsx`

- [ ] **Step 1: Create ScrollToBottom component**

Create `apps/web/src/components/workbench/chat/scroll-to-bottom.tsx`:

```tsx
"use client";

import { Button } from "@ash/ui/button";
import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";

interface ScrollToBottomProps {
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  targetRef: RefObject<HTMLDivElement | null>;
}

export function ScrollToBottom({ scrollAreaRef, targetRef }: ScrollToBottomProps) {
  const t = useTranslations("Workbench");
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    const checkDistance = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setVisible(distanceFromBottom > 200);
    };

    viewport.addEventListener("scroll", checkDistance, { passive: true });
    checkDistance();

    return () => viewport.removeEventListener("scroll", checkDistance);
  }, [scrollAreaRef]);

  // GSAP fade animation on visibility change
  useEffect(() => {
    if (visible === prevVisibleRef.current) return;
    prevVisibleRef.current = visible;

    if (buttonRef.current) {
      if (visible) {
        gsap.fromTo(
          buttonRef.current,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
        );
      } else {
        gsap.to(buttonRef.current, {
          autoAlpha: 0,
          y: 8,
          duration: 0.15,
          ease: "power2.in",
        });
      }
    }
  }, [visible]);

  const handleClick = useCallback(() => {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [targetRef]);

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      size="sm"
      type="button"
      className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 gap-1.5 rounded-full shadow-md"
      style={{ visibility: "hidden", opacity: 0 }}
      aria-label={t("scrollToBottom")}
      onClick={handleClick}
    >
      <ArrowDown className="size-3.5" />
      <span className="text-xs">{t("scrollToBottom")}</span>
    </Button>
  );
}
```

- [ ] **Step 2: Add ScrollToBottom to WorkbenchChat**

In `apps/web/src/components/workbench/chat/workbench-chat.tsx`, make these changes:

1. Add import at the top:
```tsx
import { ScrollToBottom } from "./scroll-to-bottom";
```

2. Add a `scrollAreaRef`:
```tsx
const scrollAreaRef = useRef<HTMLDivElement>(null);
```

3. Pass `ref` to the `ScrollArea` component:
```tsx
<ScrollArea ref={scrollAreaRef} className="relative min-h-0 flex-1">
```

4. Add `ScrollToBottom` inside the `ScrollArea`, after the message container div but still inside the ScrollArea:
```tsx
<ScrollArea ref={scrollAreaRef} className="relative min-h-0 flex-1">
  <div
    ref={containerRef}
    className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
    role="log"
    aria-live="polite"
    aria-relevant="additions"
  >
    {/* ... existing content ... */}
  </div>
  <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={messagesEndRef} />
</ScrollArea>
```

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck && pnpm build`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/chat/scroll-to-bottom.tsx apps/web/src/components/workbench/chat/workbench-chat.tsx
git commit -m "feat(chat): add floating scroll-to-bottom button"
```

---

### Task 7: Command Palette Provider

**Files:**
- Create: `apps/web/src/components/command-palette/command-palette-provider.tsx`

- [ ] **Step 1: Create the provider**

Create directory and file `apps/web/src/components/command-palette/command-palette-provider.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const CommandPaletteContext =
  createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, openPalette, closePalette, togglePalette }),
    [open, openPalette, closePalette, togglePalette],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within CommandPaletteProvider",
    );
  }
  return ctx;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/command-palette/
git commit -m "feat: add CommandPaletteProvider context"
```

---

### Task 8: Command Palette Component

**Files:**
- Create: `apps/web/src/components/command-palette/command-palette.tsx`

- [ ] **Step 1: Create the command palette component**

Create `apps/web/src/components/command-palette/command-palette.tsx`:

```tsx
"use client";

import { useCommandPalette } from "./command-palette-provider";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeftRight,
  Home,
  MessageSquarePlus,
  Search,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Command } from "cmdk";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";

interface CommandPaletteProps {
  onToggleWorkspace: () => void;
}

export function CommandPalette({ onToggleWorkspace }: CommandPaletteProps) {
  const { open, closePalette } = useCommandPalette();
  const { openSettings } = useSettingsModal();
  const t = useTranslations("CommandPalette");
  const tWorkbench = useTranslations("Workbench");
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animation
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    gsap.fromTo(
      dialogRef.current,
      { autoAlpha: 0, y: -8, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
    );
  }, [open]);

  const runAction = useCallback(
    (action: () => void) => {
      action();
      closePalette();
    },
    [closePalette],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label={tWorkbench("commandPaletteAria")}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePalette}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ opacity: 0 }}
      >
        <Command
          onKeyDown={(e) => {
            if (e.key === "Escape") closePalette();
          }}
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder={t("placeholder")}
              autoFocus
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </Command.Empty>

            <Command.Group heading={t("groupNavigation")} className="px-2">
              <Command.Item
                value={t("switchConversation")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() =>
                  runAction(() => {
                    /* focus sidebar search */
                    const input = document.querySelector<HTMLInputElement>(
                      '[aria-label="' + tWorkbench("searchAria") + '"]',
                    );
                    input?.focus();
                  })
                }
              >
                <Search className="size-4 text-muted-foreground" />
                {t("switchConversation")}
              </Command.Item>
              <Command.Item
                value={t("goHome")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(() => router.push("/"))}
              >
                <Home className="size-4 text-muted-foreground" />
                {t("goHome")}
              </Command.Item>
              <Command.Item
                value={t("newConversation")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(() => router.push("/"))}
              >
                <MessageSquarePlus className="size-4 text-muted-foreground" />
                {t("newConversation")}
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading={t("groupActions")} className="px-2">
              <Command.Item
                value={t("openSettings")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() =>
                  runAction(() => openSettings("account"))
                }
              >
                <Settings className="size-4 text-muted-foreground" />
                {t("openSettings")}
              </Command.Item>
              <Command.Item
                value={t("toggleWorkspace")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(onToggleWorkspace)}
              >
                <ArrowLeftRight className="size-4 text-muted-foreground" />
                {t("toggleWorkspace")}
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck`

Expected: No errors (will have unused import warnings until Task 9 wires it up).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/command-palette/command-palette.tsx
git commit -m "feat: add CommandPalette component with cmdk"
```

---

### Task 9: Wire Command Palette into WorkbenchChrome

**Files:**
- Modify: `apps/web/src/components/workbench/workbench-chrome.tsx`
- Modify: `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`

- [ ] **Step 1: Update WorkbenchChrome**

In `apps/web/src/components/workbench/workbench-chrome.tsx`, make these changes:

1. Add imports:
```tsx
import { CommandPaletteProvider, useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";
```

2. Create an inner component that uses the hook (since the outer component wraps with the provider):

```tsx
function WorkbenchChromeInner({
  locale,
  conversations,
  active,
  chatBanner,
  workspacePanel,
}: WorkbenchChromeProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Workbench");
  const { togglePalette } = useCommandPalette();

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  const workspaceToggle = useMemo<WorkspaceToggleProps>(
    () => ({ collapsed: workspaceCollapsed, onToggle }),
    [workspaceCollapsed, onToggle],
  );

  // Global Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePalette]);

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

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <WorkbenchSidebar
        locale={locale}
        conversations={conversations}
        activeId={active.id}
      />

      <WorkbenchChat
        locale={locale}
        active={active}
        workspace={workspaceToggle}
        banner={chatBanner}
      />

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
            variant="pill"
            size="sm"
            className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
            type="button"
            aria-label={t("expandWorkbenchAria")}
            onClick={onExpand}
            style={{ visibility: workspaceCollapsed ? "visible" : "hidden" }}
          >
            <PanelRightOpen className="size-4" aria-hidden />
            {t("workspaceTitle")}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{t("workspaceFabTooltip")}</TooltipContent>
      </Tooltip>

      <CommandPalette onToggleWorkspace={onToggle} />
    </div>
  );
}
```

3. Update the exported component to wrap with both providers:

```tsx
export function WorkbenchChrome(props: WorkbenchChromeProps) {
  return (
    <SettingsModalProvider>
      <CommandPaletteProvider>
        <WorkbenchChromeInner {...props} />
      </CommandPaletteProvider>
    </SettingsModalProvider>
  );
}
```

4. Add `useEffect` to the imports from React.

- [ ] **Step 2: Wire sidebar Cmd+K button**

In `apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx`:

1. Add import:
```tsx
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
```

2. Inside the `WorkbenchSidebar` function, add the hook:
```tsx
const { openPalette } = useCommandPalette();
```

3. Find the dead Cmd+K button (around line 165-177) and add `onClick`:
```tsx
<Button
  variant="outline"
  size="sm"
  type="button"
  className="w-full gap-2 text-muted-foreground"
  aria-label={t("commandPaletteAria")}
  onClick={openPalette}
>
```

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck && pnpm build`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/workbench-chrome.tsx apps/web/src/components/workbench/sidebar/workbench-sidebar.tsx
git commit -m "feat: wire command palette with Cmd+K global shortcut and sidebar button"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full lint + typecheck + build**

Run: `pnpm lint && pnpm typecheck && pnpm build`

Expected: All pass with no errors.

- [ ] **Step 2: Manual smoke test**

Run: `pnpm --filter web dev`

Test checklist:
1. Open a conversation with assistant messages — verify markdown renders (headings, bold, code blocks, links, lists)
2. Hover over an assistant message — verify copy button appears, click it, verify clipboard
3. In the composer, type a long message — verify textarea grows up to max height
4. Press Enter — verify message sends. Press Shift+Enter — verify newline inserts
5. Scroll up in a conversation — verify scroll-to-bottom button appears
6. Click scroll-to-bottom — verify smooth scroll to latest message
7. Press Cmd+K — verify command palette opens
8. Type in the palette — verify commands filter
9. Select "Open settings" — verify settings modal opens
10. Select "Toggle workspace" — verify workspace collapses/expands
11. Click the sidebar Cmd+K button — verify palette opens
12. Press Escape — verify palette closes
13. Switch locale to zh — verify all new strings are translated

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A && git commit -m "fix: address verification findings"
```
