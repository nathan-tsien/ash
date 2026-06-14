# Workbench Chat — conversational center rail

Purpose: render conversational timeline + composer capturing user steering instructions.

Forbidden: collapsing Plan timelines into chat bubbles as the sole UX (Workspace remains authoritative per ADR-0004 unless superseded).

## Message rendering (`Message` array)

Ascending sort by ISO `createdAt`. Roles:

| `role` | Layout |
|--------|--------|
| `user` | Right-aligned filled chip (`bg-secondary`, `max-w-[80%]`) — plain text with `whitespace-pre-wrap` |
| `assistant` | Left-aligned **borderless prose on the canvas** (`w-full`, no card/border) — **markdown rendered** via `react-markdown` + `rehype-highlight` + `remark-gfm` |
| `system` | Not shown as bubbly transcript (debug overlays future-gated — default hidden) |

Role hierarchy comes from structure, not a near-identical bubble pair (PRIN-4): the
assistant turn is the primary content (full reading measure, no chrome) while the user
turn is a bounded interjection chip. Only the user role carries a filled surface.

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

### Timestamps

Each turn carries a relative timestamp (`formatRelativeTime`) as secondary provenance. It is
kept in the DOM (screen readers, reserved layout) but **revealed on hover/focus** of the turn
(`opacity-0` → `group-hover/bubble:opacity-100` / `group-focus-within/bubble:opacity-100`) so it
does not clutter every turn at rest (PRIN-2). Trade-off: at-a-glance provenance costs one hover;
the authoritative audit trail (tool/artifact timestamps) lives in the Workspace.

### Scroll + stickiness rules

Upon local user sends: snap scroll to newest unless reader explicitly detached (future “jump latest” chip).

Historical reading must not jitter when remote streaming updates arrive without user opting in.

### Scroll-to-bottom button

Floating pill button appears when user scrolls > 200px from bottom of the `ScrollArea`. Monitors scroll position via the Radix viewport (`[data-radix-scroll-area-viewport]`). GSAP fade animation on visibility change (`autoAlpha` + `y`). Click scrolls to latest message via `scrollIntoView({ behavior: "smooth" })`. Positioned bottom-center, above the composer. i18n key: `Workbench.scrollToBottom`.

### Composer

- Rests at ~2 rows (`min-h-[48px]`), auto-grows on content via `useEffect` resetting `height` to `auto` then capping at `scrollHeight` (`max-h-[168px]`).
- Focus is signalled by the container `focus-within` ring only; the prior GSAP `scale: 1.01` on the full-bleed bar was removed (it nudged sub-pixel layout — MOTION-6, decorative motion avoided in panes).
- `Enter` sends; `Shift+Enter` inserts newline. Send button with GSAP press animation also available.
- IME-safe: the `Enter` that confirms an IME candidate (Chinese/Japanese/Korean) does **not** submit. Skips send while a composition is active, combining a `compositionstart`/`compositionend` ref with the native `isComposing` flag and the legacy `229` keyCode (browsers disagree on whether `compositionend` precedes the confirming keydown). Shared via the `useEnterSubmit` hook so the composer and the `AnswerPrompt` input behave identically.
- Shortcut hint updated to **Enter 发送 · Shift+Enter 换行** (i18n `Workbench.shortcutHint`).
- Attachment icon visible but disabled with tooltip (**即将推出**) until roadmap unlocks ingestion.

Ensure composer remains keyboard navigable (`aria-multiline`, proper label association).

## Live task runs (ADR-0011)

For a Task started in-session, the Chat renders the **live** message list from `TaskRunProvider`. The home composer creates + starts a task via `PraxisTaskClient`, then routes to `/app/task/[id]`; `runtimeEventReducer` folds the praxis `RuntimeEvent` SSE stream into the `Task`:

- `text_delta` chunks accumulate into a single assistant `Message` with `isStreaming: true`; `turn_completed`/`turn_failed` clears the flag.
- The existing `status === "running"` thinking placeholder covers the turn-in-flight window.
- `thinking_delta` and `skill_activation_requested` are not surfaced this slice.

This slice ships **no real transport** — a local fake drives the stream (see ADR-0011). The "remote streaming updates" stickiness rule above still applies to the simulated stream.

### Pending question (ask_user)

When the live task is `awaiting_input`, the chat renders an `AnswerPrompt` card showing the
`pendingQuestion` payload (`askId`, `text`, `attachments`). The sidecar props `pendingQuestion`
and `onAnswer(text: string)` are passed to `WorkbenchChat` directly from `workbench-app.tsx` —
they are **not** carried by the adapted `Conversation`. The adapter's `mapTaskStatus` maps
`awaiting_input` → `idle` (not `running`): while the agent waits on the user it is not "thinking",
so the chat shows the prompt rather than the thinking indicator. (The sidebar dot uses a separate
mapping in `lib/task-status.ts`, where `awaiting_input` → `running` to read as active.) Submitting
the prompt calls `onAnswer(text)`, which routes to `provider.answer(taskId, text)` →
`POST /v1/tasks/{id}/answers {ask_id, answer}` (202). The input clears and disables optimistically
while the answer is in flight; normal composition restores on the `turn_resumed` event delivered on
the same open stream. On a `409` (already resolved server-side) the prompt stays cleared; on a `404`
the task is surfaced as failed; other errors restore the question for retry. Accessibility: focus
moves to the prompt on appearance; an `aria-live` region announces the question text. Visual tokens
follow `docs/design-guidelines.md` (no rogue palette literals; ADR-0013/0014).

**Re-attach (navigate-back).** When a task view is (re)opened, `workbench-app.tsx` calls
`useReattachOnView(taskId)`. Streams persist across in-session navigation, so this is guarded
(`provider.attach`): it no-ops for unknown/terminal tasks and ones already streaming, acting only
when a non-terminal stream has actually ended — catching up via `GET /v1/tasks/{id}/history` then
re-subscribing (recovering the live `ask_id`).

**Deep-link cold load (ADR-0016).** Full reload / direct navigation to `/app/task/[id]` now hydrates
(previously deferred). The server component fetches the task (`getActiveTask` → `GET /v1/tasks/{id}`)
and a `TaskSeeder` seeds it into `TaskRunProvider` via `seedTask` on mount; `useReattachOnView` then
runs history catch-up + re-subscribe. The seed↔reattach ordering on a cold mount is made
deterministic by mirroring `runsRef` with `useLayoutEffect` (runs before child effects) and gating
reattach on run presence, so `attach` always sees the seeded task.

**Cancel.** When the active task is cancellable (`running`, or `awaiting_input` via the
`pendingQuestion` prop), the chat header shows a **cancel button** (`cancelTask` i18n key). It calls
`provider.cancelTask(id)` → `POST /v1/tasks/{id}/cancel`, aborts the live stream controller, and
flips the task to a terminal state.

**Multi-turn follow-up (ADR-0016).** On an existing task (including a completed one) the composer
sends a free follow-up instead of an answer: `workbench-app.tsx` passes `onFollowUp` to the chat for
task views, which routes to `provider.sendFollowUp(id, text)` → optimistic user message appended to
the provider task + `POST /v1/tasks/{id}/messages`, then the same `runStream` mechanism re-subscribes
for the assistant turn. The provider task is the single source of truth for the follow-up message
(no local `extraMessages` append for task views, avoiding duplication). The `awaiting_input` answer
path is unchanged and takes precedence when a `pendingQuestion` is present.

See ADR-0015 (interactive execution) and ADR-0016 (contract-first codegen + transport) for the full
decision records.

## Animations (GSAP)

Message entrance, thinking-state pulse, and composer micro-interactions are powered by GSAP (not CSS transitions). All animations respect `prefers-reduced-motion` via `gsap.matchMedia()` — when the user has reduced motion enabled, elements appear in their final state without animation. Animation foundation lives in `apps/web/src/lib/animations/`.

