# Skill injection at task start (praxis 0.2.0)

Status: approved (2026-06-15)
Owner: ash web
Upstream: praxis `openapi-v0.2.0` (released 2026-06-14, additive/backward-compatible)

## Problem

praxis 0.2.0 ships skill discovery and skill hinting:

- `GET /v1/skills` -> `SkillList` of `ResourceDescriptor` (`id`, `display_name`,
  `description`, `kind`/`scope`/`binding`, ...). `description` is the load-bearing
  routing signal.
- `GET /v1/skills/{id}` -> `SkillDetail` (descriptor + `instructions` body).
- `StartTaskRequest.skill_hints` (array of skill ids), unioned with the retained
  single-value `skill_hint`. **Hints, not locks**: the model may still pick a
  different skill, and unregistered ids are silently ignored.

ash today starts a task with no skill input. The vendored contract is pinned at
`openapi-v0.1.6`; `skill_hint` exists but is unused, and the settings "Skills"
section is a Phase-2-disabled placeholder backed by a local `AgentSkill` mock.

Goal: let the user **discover and select skills when starting a task**, send them
as `skill_hints`, and surface the real skill catalog (read-only) in settings —
all contract-first off the regenerated 0.2.0 types.

## Decisions (locked)

1. **Selection at task start only.** `skill_hints` is accepted only by the start
   endpoint; follow-up messages carry no skill field, so the picker lives on the
   home composer. No per-task hint memory this slice.
2. **Multi-select**, sent as `skill_hints: string[]`. We do not use the legacy
   single `skill_hint`.
3. **Activation feedback deferred.** The `skill_activation_requested` RuntimeEvent
   stays a reducer no-op this slice.
4. **Settings becomes a real read-only catalog** from `GET /v1/skills`, replacing
   the `AgentSkill` mock usage in the settings section.
5. **Picker UX**: a "Skills" button by the composer opens a Radix `dropdown-menu`
   checklist (skill `display_name` + `description`, multi-select). Chosen skills
   render as removable `Badge` chips next to the composer. Copy frames them as
   *preferred/suggested* (zh-CN baseline), honest about hint-not-lock semantics.

## Architecture

Layers, top (contract) to bottom (UI):

### 1. Contract + codegen (foundation)

- `apps/web/scripts/sync-praxis-contract.sh`: bump `TAG` default
  `openapi-v0.1.6` -> `openapi-v0.2.0`.
- Run `pnpm --filter @ash/web sync:praxis` then `gen:praxis`. The committed
  snapshot (`contract/praxis.yaml`, `contract/schemas.json`) and `generated.ts`
  must match the tag (CI `sync:praxis:check` + `gen:praxis:check` enforce this).
- `runtime-events.ts`: re-export `SkillSummary = components["schemas"]["ResourceDescriptor"]`
  and `SkillList`. `SkillDetail`/`getSkill` are NOT exported this slice (no detail
  view yet — YAGNI; add when a "view instructions" affordance lands).

### 2. BFF allowlist

`apps/web/src/server/praxis.ts`: the `ALLOWED` guard currently permits only
`/v1/tasks/**`. Extend it to also permit `/v1/skills/**`:

```
const ALLOWED = (s: string[]) =>
  s[0] === "v1" && (s[1] === "tasks" || s[1] === "skills");
```

Keeps the proxy closed to everything else.

### 3. Transport client

- `client.ts` (`PraxisTaskClient` interface):
  - Add `listSkills(params?: { limit?: number; cursor?: string }): Promise<SkillList>`
    (`GET /v1/skills`).
  - Change `startTask(id, userInput, skillHints?: string[]): Promise<TaskSummary>`.
- `http-client.ts`:
  - `listSkills` -> `api.GET("/v1/skills", { params: { query: { limit, cursor } } })`.
  - `startTask` -> body `{ user_input, ...(skillHints?.length ? { skill_hints: skillHints } : {}) }`.
    Omit the field entirely when empty so the payload stays clean.
- `fake-client.ts` (unit-test only): implement `listSkills` (fixed catalog) and the
  new `startTask` arity to satisfy the interface. Per `mock-client-ut-only`
  discipline it is never selected at runtime.

`GET /v1/skills` is documented "single page"; the client fetches one page and does
not loop on `next_cursor`. (If a future skill registry grows past one page, add a
cursor loop then.)

### 4. Skill catalog hook (shared, client-side)

New `apps/web/src/lib/praxis/use-skill-catalog.ts`:

- `useSkillCatalog(): { skills: SkillSummary[]; loading: boolean; error: boolean }`.
- Calls `getPraxisClient().listSkills()` once and memoizes the in-flight promise at
  module scope, so navigating home <-> settings does not refetch within a session.
- Both the task-start picker and the settings catalog consume this one hook
  (single code path; the picker fundamentally needs the list client-side, so we do
  not split into an RSC fetch).
- On error it returns `error: true` with an empty list; consumers degrade
  gracefully (picker hides/disables the button; settings shows an error line).

### 5. Task-start picker UI

New `apps/web/src/components/workbench/skill-picker.tsx` (client):

- Props: `selected: string[]`, `onChange(ids: string[])`, `disabled?: boolean`.
- A `Button` ("技能" / suggested-skills) opens a `DropdownMenu` of
  `DropdownMenuCheckboxItem`s, one per `SkillSummary` (`display_name` bold +
  `description` muted). Toggling updates `selected` via `onChange`.
- Selected skills render outside the menu as removable `Badge` chips (X removes).
- Empty catalog -> button hidden. Loading -> button shows a disabled/spinner state.

Wire into `workbench-home.tsx`:

- Add `const [skillIds, setSkillIds] = useState<string[]>([])`.
- Render `<SkillPicker selected={skillIds} onChange={setSkillIds} disabled={starting} />`
  adjacent to the composer input (in the `!pendingPrompt` composer block).
- `handleStart` -> `startTask(prompt, skillIds)`; clear `skillIds` on success.
- The pending-prompt quick-start path starts with no hints (no picker there).

### 6. Provider threading

`task-run-provider.tsx`:

- `startTask(directive: string, skillHints?: string[]): Promise<string>` — pass
  `skillHints` through to `clientRef.current.startTask(summary.id, directive, skillHints)`.
  `createTask` is unchanged (hints belong on the start call, not create).
- `useStartTask()` return type updates to `(directive: string, skillHints?: string[]) => Promise<string>`.
- `TaskRunContextValue.startTask` signature updates to match.

### 7. Settings catalog

`settings/sections/skills-section.tsx`: replace the disabled Phase-2 placeholder
with a read-only catalog driven by `useSkillCatalog()` — list each skill's
`display_name` + `description`. Since `binding` is always `hint` and `enabled` is
null for hints, there is nothing to toggle; it is purely informational. Remove the
`AgentSkill` mock dependency from this section (the `packages/shared` mock + type
may remain for now if other code references them — verify and only delete if
unused).

## Data flow

```
home composer: useSkillCatalog() --GET /v1/skills--> BFF --> praxis   (discovery)
user toggles skills -> skillIds state -> handleStart
  -> provider.startTask(directive, skillIds)
     -> createTask({user_input, title})            POST /v1/tasks
     -> startTask(id, directive, skillIds)         POST /v1/tasks/{id}/start
        body { user_input, skill_hints: [...] }
  -> stream events as today (no skill changes downstream)
settings: useSkillCatalog() -> read-only list
```

## Error handling

- Skill list fetch failure: non-fatal everywhere. Picker degrades (button hidden);
  task start still works with no hints. Settings shows an error line.
- Unregistered/garbage ids: praxis ignores them (hint semantics) — no client guard.
- `startTask` failure path is unchanged (existing re-enable-composer / failed-state
  handling in `workbench-home.tsx` + provider).

## Testing (TDD)

- `http-client`: `listSkills` calls `GET /v1/skills` and unwraps; `startTask`
  includes `skill_hints` only when non-empty, omits otherwise.
- `fake-client`: satisfies the updated interface.
- `use-skill-catalog`: fetches once (memoized), exposes loading/error.
- `skill-picker`: renders catalog, toggles selection, removes chips, hides on empty.
- `task-run-provider`: `startTask` forwards `skillHints` to the client.
- `skills-section`: renders catalog list; loading/empty/error states.
- i18n: zh-CN strings added for picker + settings; `scripts/check-i18n.mjs` passes.

## Docs / records

- `docs/components/workbench-chat.md`: document the task-start skill picker
  (payload contract: `skill_hints`, hint-not-lock semantics).
- `docs/components/settings.md`: settings Skills section now a live read-only
  catalog.
- `docs/adr/0017-praxis-0.2.0-skill-discovery-and-hints.md`: record adoption of
  `GET /v1/skills` + `skill_hints` at task start; note activation feedback and
  per-task hint memory deferred.
- `ROADMAP.md`: add a Phase 2 sub-slice row (P2.4 — skill discovery + hints at
  task start).

## Out of scope (deferred)

- Surfacing `skill_activation_requested` during a run.
- Per-task hint memory / follow-up skill selection.
- Skill detail view (`GET /v1/skills/{id}` / `SkillDetail.instructions`).
- Editing/authoring skills (binding is `hint`-only in 0.2.0).
