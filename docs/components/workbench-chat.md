# Workbench Chat — conversational center rail

Purpose: render conversational timeline + composer capturing user steering instructions.

Forbidden: collapsing Plan timelines into chat bubbles as the sole UX (Workspace remains authoritative per ADR-0004 unless superseded).

## Message rendering (`Message` array)

Ascending sort by ISO `createdAt`. Roles:

| `role` | Layout |
|--------|--------|
| `user` | Right-aligned “pill” — plain text with `whitespace-pre-wrap` |
| `assistant` | Left card w/ bordered surface — **markdown rendered** via `react-markdown` + `rehype-highlight` + `remark-gfm` |
| `system` | Not shown as bubbly transcript (debug overlays future-gated — default hidden) |

### Markdown rendering (assistant messages)

Assistant messages render as markdown using `react-markdown` with `remark-gfm` (tables, task lists, autolinks) and `rehype-highlight` (syntax highlighting). Custom renderers:

- `<a>` opens in new tab (`target=”_blank”`, `rel=”noopener noreferrer”`)
- Inline `<code>` gets subtle `--muted` background via `.prose-chat` scoped styles
- `<pre>` blocks use `github-dark` highlight.js theme (imported in component, not globals)
- Prose styles scoped to `.prose-chat` class in `packages/ui/src/globals.css`

User messages remain plain `<p>` elements.

### Message copy button

Hover-reveal copy button on all message bubbles (user + assistant). Uses `group/bubble` Tailwind pattern — button has `opacity-0` with `group-hover/bubble:opacity-100`. Positioned top-right of bubble (`absolute -right-2 -top-2`). GSAP micro-animation: scale bounce on click (`back.out(1.7)` ease). Visual feedback: switches from `Copy` icon to `Check` icon for 2 seconds. Uses `navigator.clipboard.writeText`. Tooltip shows i18n `copyMessage` / `copiedMessage`.

### Streaming representation

If `isStreaming`:

- Maintain stable React keys keyed by logical message id — never regenerate entire subtree each token tick.
- Subtle caret / gradient shimmer permissible.
- Respect scroll policy (below).

Thinking indicator localized copy example: **Agent 正在思考…** (zh-CN surfaced string; docs remain English explanatory).

Assistant secondary metadata (relative absolute hybrid) permissible bottom-right subdued.

### Scroll + stickiness rules

Upon local user sends: snap scroll to newest unless reader explicitly detached (future “jump latest” chip).

Historical reading must not jitter when remote streaming updates arrive without user opting in.

### Scroll-to-bottom button

Floating pill button appears when user scrolls > 200px from bottom of the `ScrollArea`. Monitors scroll position via the Radix viewport (`[data-radix-scroll-area-viewport]`). GSAP fade animation on visibility change (`autoAlpha` + `y`). Click scrolls to latest message via `scrollIntoView({ behavior: "smooth" })`. Positioned bottom-center, above the composer. i18n key: `Workbench.scrollToBottom`.

### Composer

- Minimal height `min-h-[72px]`, auto-grows on content via `useEffect` resetting `height` to `auto` then capping at `scrollHeight` (`max-h-[168px]`).
- `Enter` sends; `Shift+Enter` inserts newline. Send button with GSAP press animation also available.
- Shortcut hint updated to **Enter 发送 · Shift+Enter 换行** (i18n `Workbench.shortcutHint`).
- Attachment icon visible but disabled with tooltip (**即将推出**) until roadmap unlocks ingestion.

Ensure composer remains keyboard navigable (`aria-multiline`, proper label association).

## Live task runs (ADR-0011)

For a Task started in-session, the Chat renders the **live** message list from `TaskRunProvider`. The home composer creates + starts a task via `PraxisTaskClient`, then routes to `/app/task/[id]`; `runtimeEventReducer` folds the praxis `RuntimeEvent` SSE stream into the `Task`:

- `text_delta` chunks accumulate into a single assistant `Message` with `isStreaming: true`; `turn_completed`/`turn_failed` clears the flag.
- The existing `status === "running"` thinking placeholder covers the turn-in-flight window.
- `thinking_delta` and `skill_activation_requested` are not surfaced this slice.

This slice ships **no real transport** — a local fake drives the stream (see ADR-0011). The "remote streaming updates" stickiness rule above still applies to the simulated stream.

## Animations (GSAP)

Message entrance, thinking-state pulse, and composer micro-interactions are powered by GSAP (not CSS transitions). All animations respect `prefers-reduced-motion` via `gsap.matchMedia()` — when the user has reduced motion enabled, elements appear in their final state without animation. Animation foundation lives in `apps/web/src/lib/animations/`.

