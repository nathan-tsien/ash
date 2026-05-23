# Workbench Sidebar — left inventory rail

Purpose: session/task ledger + durable global affordances (**new task**, **search**, **account**) without absorbing chat transcripts.

Forbidden: duplicating Workspace responsibilities (plans/artifacts/tool traces belong right rail).

## Row contract (`Conversation`)

Display fields via `Conversation` structs from `@ash/shared/src/types.ts` — update both code + docs when payloads shift.

| Field | Visual treatment |
|-------|------------------|
| `title` | Primary line (`font-medium` baseline). If `unread`, bump weight |
| `preview` | `line-clamp:1`, muted foreground |
| `updatedAt` | Relative copy via helpers (`formatRelativeTime`) zh-CN textual |
| `status` *(optional badges)* | `idle` subdued dot · `running` subtle pulse animation · `completed` textual tag · `failed` destructive cue |

Selecting a row navigates to `/c/[id]`; emphasize active conversation using sidebar accent backgrounds.

### Collapsed rail icons

Preserve essential affordances vertically (logo, compose, search, overflow). Tooltip text stays zh-CN. Keyboard tab order must traverse icon stack predictably (`Tab`, `Shift+Tab`, activation via `Enter`/`Space`).

### Search UX

Placeholder example: **搜索任务…**

Debounced filter `~200ms`, case-insensitive substring across `title` + `preview`. Empty-result state communicates **重置搜索** intent.

New task button (pill / outlined) uses Manus-esque emphasis (soft shadow on hover).

CTA semantics Phase 1: choose either deterministic seeded id (`conv-new-demo`) **or** random ULID-equivalent —
record whichever approach lands in Git history + reflect here deterministically (**do not silently toggle**).

