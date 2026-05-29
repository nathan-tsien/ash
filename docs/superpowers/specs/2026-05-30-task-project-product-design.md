# Task/Project Product Design — ash 产品概念与界面架构

**Date:** 2026-05-30
**Status:** Draft
**Supersedes:** N/A (builds on Phase 1 foundation from `2026-05-23-ash-startup-design.md`)

## Problem

Phase 1 ash uses **Conversation** as the primary organizational unit. The Sidebar displays a conversation list, clicking one opens a Chat + Workspace pair. However, the backend (praxis) exposes **Task** as the API-level concept, and the product vision requires **Project** as a higher-level workspace abstraction. The current UI model does not align with the product's intended user mental model.

## System Architecture

```
┌─────────────────────────────────────────────┐
│                    ash                       │
│         User-facing product (Next.js)        │
│   Sidebar · Chat · Workspace layout          │
└──────────┬──────────────┬───────────────────┘
           │              │
           ▼              ▼
┌──────────────┐  ┌──────────────────────────┐
│     iam      │  │        praxis             │
│  Auth service │  │   Agent service           │
│              │  │   (built on cogito)       │
│              │  │  Task + Project API       │
└──────────────┘  └──────────────────────────┘
```

| Service | Role |
|---------|------|
| **iam** | Authentication and authorization |
| **praxis** | Backend Agent service built on cogito runtime. Exposes Task API (single task execution) and Project API (multi-task workspace). Internally uses cogito sessions. |
| **ash** | Unified user-facing product |

**Communication:** ash <-> iam/praxis transport is TBD (HTTP REST likely, to be finalized via ADR).

**Key boundary:** "Conversation" is an internal cogito/praxis implementation detail. Users see **Tasks** and **Projects** only.

## Product Concepts

### Task

A one-shot agent interaction. User provides a directive, agent executes, returns results.

Examples: remove watermark from image, generate PPT from uploaded materials, translate document.

| Property | Description |
|----------|-------------|
| Lifecycle | Short-lived: create -> execute -> complete/failed |
| User input | Natural language directive + optional file attachments |
| Output | Produced artifacts (files, text, previews) |
| Execution | Single praxis Task call backed by a cogito session |

### Project

A persistent multi-task workspace. Contains a theme, external data connectors, multiple tasks, and consolidated outputs.

Examples: self-media content project (collect materials -> analyze -> write vlog script), quarterly reporting project (upload materials -> run tasks -> produce deliverables).

| Property | Description |
|----------|-------------|
| Lifecycle | Long-lived: create -> iterate -> archive |
| Theme | User-defined project topic/description |
| Connectors | External data sources (Google Drive, Notion, MCP, etc.) |
| Materials | Uploaded files and connector-fetched data |
| Tasks | Multiple tasks, can be created sequentially or in parallel |
| Artifacts | Consolidated outputs from all tasks |

### Connector

External data source integration for Projects. Provides materials that tasks can reference.

Supported sources (initial): Google Drive, Notion, MCP servers.

### Relationship

- A **Task** can exist independently (quick task) or belong to a **Project**.
- A **Project** always contains one or more **Tasks**.
- **Conversation** is hidden from users; it is the internal mechanism by which praxis/cogito executes a Task.

## Routing

| Route | View | Auth |
|-------|------|------|
| `/` | Marketing page (product intro, features, signup/login) | Public |
| `/app` | Workbench (authenticated main interface) | Required |
| `/app/task/[taskId]` | Task detail (Chat + Workspace) | Required |
| `/app/project/[projectId]` | Project detail (Chat + Project space) | Required |
| `/app/settings` | User settings | Required |

Navigation rules:
- Logo click -> `/app` (workbench)
- Unauthenticated access to `/app` -> redirect to `/`
- Authenticated access to `/` -> show marketing page with "Enter Workbench" CTA in header

## Sidebar Design

The Sidebar uses a dual-section layout: **Tasks** and **Projects**.

```
┌──────────────────────────┐
│  Logo           [Cmd+K]  │
│                          │
│  [Search tasks/projects] │
│                          │
│  -- Tasks ------- [+] -- │
│  task item 1    relative │
│  task item 2    time     │
│  task item 3             │
│                          │
│  -- Projects ---- [+] -- │
│  project 1      3 Tasks  │
│  project 2      active   │
│                          │
│  ----------------------  │
│  User avatar + name      │
│  Settings gear           │
└──────────────────────────┘
```

### Task list item

| Field | Display |
|-------|---------|
| Title | Agent-generated or user-assigned, `font-medium` |
| Status | idle (subdued dot) / running (pulse) / completed (check) / failed (destructive) |
| Time | Relative time (`formatRelativeTime`, zh-CN) |

Selected state: accent background highlight. Sidebar structure does not change when a Task is selected.

### Project list item

| Field | Display |
|-------|---------|
| Name | Project name, `font-medium` |
| Summary | Task count + status (e.g., "2 running - 1 completed") |

Clicking a Project switches the Sidebar to project-internal navigation (Task list within the project).

### List limits

Sidebar shows the most recent 10 items per section. For full lists, use the search box or Command Palette (Cmd+K).

### Section headers

Each section header has a `[+]` button:
- Tasks `[+]` -> triggers new Task creation in Chat area
- Projects `[+]` -> opens Project creation dialog

### Bottom bar

- User avatar + display name (from iam)
- Settings icon -> `/app/settings`

### Search

Unified search box. Searches both Tasks and Projects. Results grouped by type.

### Command Palette (Cmd+K)

Existing command palette extended with:
- Search Tasks (type to filter, Enter to navigate)
- Search Projects (type to filter, Enter to navigate)
- New Task
- New Project

## Task View

When a Task is selected in the Sidebar:

### Sidebar

No structural change. Only the selected Task item gets an accent highlight.

### Chat pane

Displays the Task's execution conversation:
- User directive (right-aligned bubble)
- Agent responses (left-aligned, markdown rendered)
- Execution status indicators

### Workspace pane

Two sections:

| Section | Content |
|---------|---------|
| **Artifacts** | Produced files with preview/download/share actions |
| **Execution details** | Tools used, duration, status |

## Project View

When a Project is selected in the Sidebar:

### Sidebar

Switches to project-internal navigation:
- Back arrow -> return to main Tasks/Projects list
- Project name as header
- Task list within the project (with selected state)
- New Task button

### Chat pane

The Project's main conversation. User drives project progress through dialogue:
- Agent plans tasks, creates them, reports progress
- User can provide guidance, approve plans, request changes

### Workspace pane (Project Space)

Vertical stacked cards/sections:

| Section | Content |
|---------|---------|
| **Materials** | Uploaded files + connector-fetched data. Upload/delete actions. |
| **Tasks** | Project task list with status indicators. New Task action. |
| **Artifacts** | Consolidated outputs from all project tasks. Preview/download. |
| **Project Settings** | Name, theme/description, connector configuration. |

## Task Creation Flow

1. User clicks Tasks `[+]` in Sidebar (or uses input in default state)
2. Chat area shows an input field
3. User describes the task in natural language, optionally attaches files
4. User sends -> praxis creates a Task -> Chat displays execution progress
5. Task appears in Sidebar Tasks list

## Project Creation Flow

1. User clicks Projects `[+]` in Sidebar
2. Project creation dialog appears with fields:
   - Project name
   - Theme/description
   - Connector selection (Drive, Notion, MCP, etc.)
3. User submits -> Project is created -> enters Project view
4. User can then add materials and create Tasks within the Project

## Default Workbench State

When user enters `/app` with no Task/Project selected:

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar        │ Chat                │ Workspace        │
│                │                     │                  │
│ -- Tasks ---[+]│                     │                  │
│   recent       │  Central input box  │                  │
│   tasks        │  "Describe your     │                  │
│                │   task..."          │                  │
│ -- Projects[+] │                     │                  │
│   recent       │  Recent Tasks       │                  │
│   projects     │  [card] [card]      │                  │
│                │                     │                  │
│                │  Projects           │                  │
│                │  [card] [card]      │                  │
│                │                     │                  │
│ User info      │                     │                  │
│ Settings       │                     │                  │
└─────────────────────────────────────────────────────────┘
```

- Central input box for quick Task creation
- Recent Tasks and Projects as clickable cards
- Workspace pane hidden or shows placeholder

## Migration from Phase 1

| Phase 1 concept | New concept |
|-----------------|-------------|
| Conversation list in Sidebar | Task list + Project list |
| `/c/[conversationId]` route | `/app/task/[taskId]` or `/app/project/[projectId]` |
| Workspace: Plan/Tools/Artifacts | Task view: Artifacts + Execution details; Project view: Materials/Tasks/Artifacts/Settings |
| Chat: conversation thread | Chat: Task execution history or Project main conversation |

Existing Phase 1 components (MessageBubble, Composer, CommandPalette, etc.) are reused within the new navigation structure.

## Out of Scope

- Marketing page design (separate spec)
- iam integration details (auth flow, token management) (ADR needed)
- praxis API contract (transport, schema) (ADR needed)
- Connector implementation details (separate spec)
- Mobile responsiveness (Phase 3 per roadmap)
