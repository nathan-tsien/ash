# Workbench Deep-Overhaul — Roadmap (non-visual work)

- Status: Planning reference
- Date: 2026-06-28
- Purpose: enumerate everything the workbench deep-overhaul needs **besides** the visual/UX system pass, with dependencies and sequencing. The visual pass (sub-project C) has its own spec + plan; this document scopes A, B, D, E so they are not forgotten and can be picked up in order.

## The decomposition (recap)

The overhaul was split because it spans visuals + information architecture + features + backend, and the deliverable side depends on a praxis contract that does not exist yet.

| # | Sub-project | One-line | Status |
|---|---|---|---|
| C | Visual/UX system pass | Neutral Stone palette + component vocabulary | **Specced + planned** (in progress) |
| A | Workspace reconception | Process timeline (replay) + deliverables bound to real attachments | Not started |
| B | Rich deliverable canvas | In-app viewers (docs/tables/charts/slides) | Not started (blocked) |
| D | Backend contract: `task_outputs` | praxis emits real artifacts/deliverables | Not started (upstream) |
| E | IA / topology | Keep three-pane; ADR housekeeping | Not started (small) |

## North-star reminder (from brainstorming)

Reference product = **Manus**, but there is **no real isolated VM** running user tasks. So the value is **not** a literal live "computer" screencast. The product targets output-heavy work: data analysis, document/report generation, deep research, self-media content, BI/financial analysis. The two Manus traits that matter: a **process timeline (replay the agent's steps)** and a strong **deliverables** experience. Both are constrained by what praxis actually emits today (see the artifact-contract findings below).

## Ground truth (what praxis emits today)

- **Tool traces are real** — derived from `tool_use` / `tool_result` content blocks (ADR-0018 block model). A process timeline has real data.
- **Artifacts are 100% synthesized** — praxis emits no artifact event; the reducer fakes a placeholder `.pptx` on completion (`runtime-event-reducer.ts`, `synthesizePptArtifact`). The `Artifact` type is metadata-only (no content/uri).
- **Attachments are the real seam** — the contract already has an `Attachment` type (`id`, `name`, `mime_type`, `size_bytes`, `uri`, `extracted_text`, `kind: file|image`, `source: user_upload|agent_generated`), carried on history messages, **not** in the live stream. `source: agent_generated` attachments are the real deliverables.

---

## Sub-project E — IA / topology decision (do first; cheapest, unblocks framing)

**Why first:** it is a decision record, near-zero code, and it sets the contract A builds against.

**Scope:**
- Confirm the three-pane topology stays (ADR-0004) and that the **right pane's *responsibility* changes** from "static plan/tools/artifacts cards" to "**process timeline + deliverables**".
- Write an ADR (amend or supersede ADR-0004) defining the workspace pane's new information model: (1) a **Process** view (timeline of steps/tool events, navigable), (2) a **Deliverables** view (agent-generated outputs). Decide tabs vs. stacked sections; decide whether the plan checklist lives in Process or stays pinned.
- Define the view-model additions A will need (e.g. a normalized `ProcessEvent[]` derived from messages/tool traces; a `Deliverable` type bound to `Attachment`). Names only — implementation is A.

**Deliverable:** one ADR + a short spec stub for A. **No app code.**

**Depends on:** nothing. **Blocks:** A.

---

## Sub-project A — Workspace reconception (the core feature work)

**Why it's the heart:** it turns the polished-but-static workspace into the Manus-style process+deliverables surface, on **mostly real data**.

**Scope:**
1. **Deliverables bound to real attachments.**
   - Replace the synthesized `.pptx` placeholder: stop fabricating in `runtime-event-reducer.ts`; instead project `agent_generated` `Attachment`s from `/history` into the deliverables list.
   - Extend the view-model: a `Deliverable` shape (from `Attachment`: name, mime_type, size, uri, source). Keep `packages/shared` free of React/Next.
   - Render by mime type with what's possible **now**: images inline (uri), links openable, other files as a real **download** (uri) — replacing the current stub. No fabricated controls.
   - Where `/history` attachments arrive vs. live stream: define refresh/catch-up so deliverables appear during and after a run.
2. **Process timeline (replay).**
   - Build a normalized `ProcessEvent[]` from the existing message blocks + tool traces (real data): step/plan transitions, tool_use/tool_result, ask_user, completion.
   - Timeline UI: navigable list; selecting an event scrolls/links to the corresponding chat turn or shows its detail. A true scrubber that reconstructs a "computer state" is **out of scope** (no VM) — this is event navigation, not screencast playback. Document that explicitly so it isn't mistaken for Manus's literal player.
3. **Workspace IA per E** (Process / Deliverables structure; plan placement).

**Verification:** real task run shows real agent-generated files as downloadable deliverables; timeline reflects real tool/step events; reducer no longer synthesizes artifacts; existing reducer/projection tests updated.

**Depends on:** E (IA decision), and benefits from C (component vocabulary) being merged first so it inherits the card/chip/timeline styling. **Soft-blocked by** D for *rich* previews (see B) but **not** for download/inline-image deliverables, which work on today's `Attachment.uri`.

**Risk:** attachment `uri` access/auth through the BFF proxy — confirm the proxy can stream/download agent-generated files (may need a BFF route). Surface early.

---

## Sub-project D — Backend contract: `task_outputs` (upstream, praxis/cogito)

**Why:** rich, structured deliverables (live charts, data tables, editable slides) need praxis to emit real, typed outputs — not just opaque file attachments. There is already a `TODO(ash): replace the synthesized placeholder deck with praxis task_outputs` in the reducer.

**Scope (ash's side = specify, not implement the runtime):**
- Define the desired praxis contract addition: a `task_output` / deliverable event or history field carrying typed, structured content (e.g. `{ kind: "table"|"chart"|"document"|"slides"|"file", payload | uri, schema }`), distinct from raw `Attachment`.
- Coordinate with the praxis/cogito upstream (`github.com/nathan-tsien/cogito`) to land it; follow the contract-first, codegen discipline (sync pinned tag, regen types) per the repo's API rules.
- Plan the reducer/view-model migration from `Attachment`-only deliverables to typed `task_outputs` once shipped.

**Depends on:** upstream availability. **Blocks:** B (rich previews). **Independent of:** C. Can be specced in parallel with A; lands when upstream does.

---

## Sub-project B — Rich deliverable canvas (in-app viewers)

**Why last:** highest effort, and the *full* version is gated on D. Partial value (image/pdf/markdown preview) is reachable on A's `Attachment.uri`.

**Scope:**
- A canvas/viewer surface (likely an expanded workspace or modal) that renders a deliverable in-app:
  - Phase B1 (on A, no D): markdown/text/code preview, image, embedded PDF (via uri).
  - Phase B2 (needs D): structured data tables, charts (BI/financial use cases), slide preview — rendered from typed `task_outputs`.
- Define the viewer registry (mime/kind → renderer), lazy-loaded so heavy viewers don't bloat the workbench bundle (respect the no-cogito-in-browser and bundle-discipline rules).

**Depends on:** A (deliverables model) for B1; **D** for B2. **Blocks:** nothing.

---

## Sequencing

```
C (visual)  ──┐
              ├─► E (IA ADR) ──► A (timeline + deliverables) ──► B1 (basic previews)
D (contract, parallel, upstream) ───────────────────────────────► B2 (rich previews)
```

Recommended order: **finish C → E → A → (B1) → land D → B2.** D is started in parallel as an upstream spec since it has external lead time.

## Cross-cutting reminders for every sub-project

- Contract-first: any praxis call is codegen'd from the OpenAPI contract; SSE is the only hand-written exception. Mock client is unit-test-only; `getPraxisClient` always returns the real transport.
- No cogito import graph into browser-facing packages; respect package layering.
- Each sub-project = its own spec → plan → implementation cycle (this doc is the index, not a substitute).
- Update `docs/components/*.md` and the relevant ADRs alongside code.
