# Agent Workbench UI — Component design index

Analogous purpose to cogito `docs/components/H0X-*`: **pane-level contracts tying UX to payload shapes.**

Normative layering references:

1. Accepted charter `docs/superpowers/specs/2026-05-23-ash-startup-design.md`
3. ADR-0004 — triple-pane UX freeze  
4. ADR-0005 + **`docs/visual-language-and-theme.md`** — tokens, chroma posture, review gates

Update these docs **together** whenever shipped behavior diverges (`AGENTS.md` finish checklist mirrors cogito’s “touch component docs if harness behavior changed.”)

## Artifact list

| Document | Scope |
|----------|-------|
| [agent-workbench-shell.md](./agent-workbench-shell.md) | Global shell grid, routing, motion, shortcuts |
| [auth.md](./auth.md) | Login flow, cookie session, automatic token refresh |
| [workbench-sidebar.md](./workbench-sidebar.md) | Sidebar inventory semantics |
| [workbench-chat.md](./workbench-chat.md) | Chat rail + composer |
| [workbench-workspace.md](./workbench-workspace.md) | Workspace cards + modular extensions |

### Implementation mapping

| Pane | Typical code locality |
|------|-----------------------|
| Layout chrome | `apps/web/app/**/layout.tsx` segments |
| Primitives | `packages/ui/src/components/*.tsx` |
| Domain mocks / types | `packages/shared/src/**` |

## ASCII IA sketch

```
+-----------+-----------------------------+------------------+
| Sidebar   | Chat                        | Workspace        |
| inventory | conversational loop         | plan/tools/output|
+-----------+-----------------------------+------------------+
```

Keep diagrams ASCII like cogito style guides emphasize — heavy Unicode ornament elsewhere stays disallowed.

