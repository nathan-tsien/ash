# ADR-0017: praxis 0.2.0 skill discovery and hints

## Status

Accepted (2026-06-15)

## Context

praxis published contract 0.2.0, additive over 0.1.6: a skill catalog (`GET /v1/skills`,
`GET /v1/skills/{id}`) and a `skill_hints` array on `StartTaskRequest`. ash had no way to discover
registered skills or steer skill selection at task start; the settings Skills section was a Phase-2
placeholder driven by `getMockSkills` toggles with no runtime backing.

Two constraints shaped the slice:

1. Skill selection in 0.2.0 is advisory. The contract exposes hints, not a lock — there is no
   field that forces a specific skill, and skill hints exist only on task start, not on follow-up
   messages.
2. All API access is codegen'd from the OpenAPI contract (ADR-0016). Skill discovery had to ride
   the same generated transport and the same BFF allowlist discipline as `v1/tasks`.

## Decision

1. Adopt praxis contract 0.2.0. The vendored snapshot is re-synced to the 0.2.0 tag; the change is
   additive over 0.1.6 (no breaking edits to the task lifecycle).

2. Add `GET /v1/skills` (and `GET /v1/skills/{id}`, not yet consumed) to the BFF allowlist. The
   allowlist previously keyed on `v1/tasks/**` only (ADR-0016 section 3); it now also admits
   `v1/skills`. The transparent-forwarder scheme is unchanged.

3. Surface skill discovery through a session-cached `useSkillCatalog` client hook (browser -> BFF
   -> praxis). The hook is shared by two consumers: the home-composer skill picker and the settings
   read-only catalog. Caching is per session, so the catalog is fetched once and reused.

4. Sending hints at task start. The home composer's `SkillPicker` multi-selects skill ids and
   sends them as `StartTaskRequest.skill_hints` (array). Hints, not locks: the model may pick a
   different skill, and unregistered ids are ignored by praxis. The legacy single `skill_hint`
   field is retained in the contract, but ash sends the array form.

5. The settings Skills section is now a live read-only catalog. It lists `display_name` +
   `description` from `GET /v1/skills`. There are no toggles — `binding` is hint-only in 0.2.0, so
   there is nothing to persist per skill. The former mock toggle UI and its i18n keys are removed.

## Consequences

- Skill discovery and task-start hints work end-to-end against the 0.2.0 contract through the
  generated transport; no hand-written skill URLs or param maps.
- The BFF allowlist now covers two endpoint families (`v1/tasks`, `v1/skills`); each new family is
  still admitted deliberately.
- Hint semantics are surfaced honestly in the UI copy (hint, not lock) so users do not expect a
  pinned skill.
- Deferred: surfacing `skill_activation_requested` during a run; per-task hint memory and
  follow-up skill selection (the contract has no skill field on `POST /messages`); and the skill
  detail view (`GET /v1/skills/{id}` / `SkillDetail.instructions`), which is allowlisted but not
  yet consumed.

## Related

- `docs/superpowers/specs/2026-06-15-skill-injection-task-start-design.md` (source of truth for
  this slice)
- ADR-0016 (contract-first codegen + transport; BFF allowlist scheme)
- `docs/components/workbench-chat.md` (task-start skill picker), `docs/components/settings.md`
  (read-only catalog)
- praxis `github.com/nathan-tsien/praxis`, tag `openapi-v0.2.0`
