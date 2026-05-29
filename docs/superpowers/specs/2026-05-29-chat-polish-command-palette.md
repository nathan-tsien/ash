# Chat Polish + Command Palette

Status: Accepted
Date: 2026-05-29

## Problem

The workbench Chat pane renders messages as plain text `<p>` elements -- no markdown, no code highlighting, no message actions. The Composer textarea does not auto-resize and only supports Cmd+Enter to send. The Command Palette (Cmd+K) button in the sidebar is a dead placeholder. Together these gaps make the workbench feel like a wireframe rather than a product.

## Scope

Two independent work streams in one spec. Both are purely frontend, no backend changes.

### Chat Polish

1. **Markdown rendering** -- Replace `<p className="whitespace-pre-wrap">` in `MessageBubble` with `<ReactMarkdown>` using `rehype-highlight` (syntax highlighting) and `remark-gfm` (tables, task lists, autolinks). Custom renderers: `<a>` opens in new tab, inline `<code>` gets subtle background, `<pre>` blocks get a copy button in top-right corner. Tailwind prose classes scoped to message content.

2. **Message copy button** -- Appears on hover over any message bubble (both user and assistant). Uses `navigator.clipboard.writeText(message.content)`. GSAP micro-animation: fade in on hover, scale bounce on click. Positioned top-right of the bubble. Uses existing `Tooltip` primitive from `@ash/ui`.

3. **Composer auto-resize** -- `useEffect` on `draft` change: reset `height` to `"auto"`, then set to `scrollHeight` capped at `max-h-[168px]`. On clear (after send), reset to `min-h-[72px]`.

4. **Enter to send** -- Replace Cmd+Enter with Enter to send. Shift+Enter inserts newline. Update shortcut hint i18n key.

5. **Scroll-to-bottom button** -- Floating pill button appears when user scrolls up > 200px from bottom. Uses `IntersectionObserver` on the sentinel div + `ScrollArea` scroll events. GSAP `fadeIn`/`fadeOut` on visibility change. Click scrolls to bottom with `behavior: "smooth"`. Positioned bottom-center, above the composer.

### Command Palette

1. **Provider** -- `CommandPaletteProvider` React context holding `open`/`close`/`toggle` functions. Wraps `WorkbenchChrome` alongside existing `SettingsModalProvider`.

2. **Component** -- `CommandPalette` renders a Radix `Dialog` containing `cmdk`'s `<Command>` primitive. Dialog overlay with backdrop blur (same as settings modal). Input at top with search icon and placeholder. Results list with keyboard navigation (up/down, Enter). Groups: "Navigation", "Actions". Empty state with i18n. GSAP entrance animation.

3. **Global shortcut** -- `useEffect` in `WorkbenchChrome` registers `keydown` listener for `Cmd+K` / `Ctrl+K`. Calls `commandPalette.toggle()`. Wires existing sidebar Cmd+K button to `commandPalette.open()`.

4. **Command set**:

| Command | Action | i18n key |
|---------|--------|----------|
| Switch conversation | Lists all conversations, type to filter, select to navigate | `palette.switchConversation` |
| New conversation | Navigates to `/` | `palette.newConversation` |
| Open settings | Opens settings modal | `palette.openSettings` |
| Toggle workspace | Triggers workspace collapse/expand | `palette.toggleWorkspace` |
| Go home | Navigates to `/` | `palette.goHome` |

5. **i18n** -- New `CommandPalette` namespace in both `en.json` and `zh.json`. All command labels, group headings, placeholders translated.

## Dependencies

New packages in `apps/web/package.json`:
- `cmdk` (~5KB gzipped) -- command palette primitive
- `react-markdown` -- markdown rendering
- `rehype-highlight` -- syntax highlighting for code blocks
- `remark-gfm` -- GitHub-flavored markdown (tables, task lists, autolinks)
- `highlight.js` -- highlight theme CSS (peer dependency of rehype-highlight)

`highlight.js` theme CSS imported in the chat component, not in `globals.css` -- scoped to chat route. Use `github-dark` theme (works well with both light and dark mode backgrounds).

## Files Changed

| File | Change |
|------|--------|
| `apps/web/package.json` | Add cmdk, react-markdown, rehype-highlight, remark-gfm, highlight.js |
| `chat/message-bubble.tsx` | Replace `<p>` with `<ReactMarkdown>`, add copy button |
| `chat/composer.tsx` | Auto-resize effect, Enter-to-send, update shortcut hint |
| `chat/workbench-chat.tsx` | Add ScrollToBottom button |
| `workbench-chrome.tsx` | Add CommandPaletteProvider, global Cmd+K listener |
| New: `command-palette/command-palette.tsx` | cmdk-based command palette |
| New: `command-palette/command-palette-provider.tsx` | Context provider |
| `sidebar/workbench-sidebar.tsx` | Wire Cmd+K button to palette.open() |
| i18n files (`en.json`, `zh.json`) | New CommandPalette namespace + chat copy strings |

## Testing

- Vitest unit tests for: auto-resize hook, scroll-to-bottom visibility logic, command palette filtering
- Manual test: markdown rendering with code blocks, copy button, Cmd+K navigation flow
- `pnpm lint && pnpm typecheck && pnpm build` must pass

## Out of Scope

- Streaming typewriter effect (Phase 2, needs real SSE)
- File/image upload (Phase 2)
- Slash commands / @-mentions (future)
- Thread/branch support (future)
- Conversation creation API (Phase 2)
