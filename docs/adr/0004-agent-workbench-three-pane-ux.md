# ADR-0004: Agent workbench UX — triple-pane IA (Manus-inspired)

## Status

Accepted

## Context

Single-column chats hide **plans** + **artifact provenance**. Agent products clustering around 2025-2026

(Dynamic plans, approvals, auditing) converge on supplementary rails.

We anchored visual inspiration on Manus patterns (dense task rails, conversational center, actionable workspace dock).

Structural shifts after launch inflate migration cost — freeze topology early analogous to cogito freezing Harness component graph.

## Decision

Mandatory panes (+ collapsible allowances):

| Pane | Canonical responsibility |
|------|--------------------------|
| **Sidebar (`~260px`)** | Session inventory · search · new-task CTA · account affordances |
| **Chat (`flex`)** | User + assistant conversational surface + composer |
| **Workspace (`~360px`)** | Plan checklist · tool traces · artifact gallery + future feature tabs |

Collapsing Sidebar to icon rails or collapsing Workspace flush-right is explicitly allowed.

Dragging responsibilities (for example relocating Plan summaries exclusively into bubbles) demands **superseding ADR**.

Feature modules (`office`, `media`, …) register extra tabs/panels anchored inside Workspace chrome — never invent fourth permanent rails without ADR.

## Consequences

- **Easier:** consistent mental model powering modular vertical overlays.
- **Harder:** small-screen adaptation deferred — eventual responsive ADR must revisit IA (cannot silently shrink to single chat).
- **Given up:** “ChatGPT single column only” MVP (explicit stakeholder rejection).

