# Workbench Workspace — structured agent trace rail

Purpose: summarize **plans**, **tool executions**, **artifacts**, and future modular capability tabs referencing `featureRegistry`.

Forbidden: pretending mock objects equal persisted Rust event logs — label mocks clearly in Storybook/tests if divergence surfaces.

### Data blobs

| Collection | Responsibility |
|-----------|----------------|
| `plan[]` | Ordered steps w/ enumerated statuses (`pending|running|done|failed`) |
| `toolTraces[]` | Chronological-ish tool summaries + durations |
| `artifacts[]` | Cards summarizing textual/code/image/link payloads |

Structural fields live in **`packages/shared/src/types.ts`** — parity required.

### Section layout default

Prefer vertical stacked cards (**Plan**, **Tools**, **Artifacts**) Phase 1. Optional tabs (`plan|tools|artifacts`) permissible — if adopted, annotate actual tab ids here to avoid ambiguity.

Running plan rows highlight trailing accent gutter; forbid drag-sort until dedicated interaction ADR.

### Tool traces timeline orientation

Chosen default: **oldest top → newest bottom** (mirrors conversational reading). Changing orientation requires documenting rationale + migrating fixtures.

Statuses:

| Status | Palette guidance |
|--------|------------------|
| `success` | subtle emerald-muted |
| `running` | spinner / pulse occupying secondary text |
| `error` | destructive token |

### Artifact interactions (Phase 1 placeholder level)

| `kind` | Behavior |
|--------|----------|
| `document` | stub open action toast |
| `code` | read-only monospace preview expansion |
| `image` | placeholder chrome |
| `link` | `https?` navigates `_blank`; else copy fallback |

Collapsing Workspace entirely should yield floating re-open control so Chat never orphans auditing story.

Future feature packs (`office`, `media`, …): mount inside Workspace chrome via registry metadata — altering rail count still banned without superseding ADR.

