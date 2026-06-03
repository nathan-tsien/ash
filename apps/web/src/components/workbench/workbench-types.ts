import type { AshLocale, Conversation, Task, Project } from "@ash/shared";
import type { ReactNode } from "react";

/** View mode determines which entity the workbench is displaying. */
export type WorkbenchViewMode = "task" | "project" | "home";

export interface WorkbenchShellProps {
  locale: AshLocale;
  conversations: Conversation[];
  active: Conversation;
  /** Optional banner rendered above the chat scroll area. */
  chatBanner?: ReactNode;
}

/** Props for the new Task/Project-aware workbench. */
export interface WorkbenchAppProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
  activeTask?: Task;
  activeProject?: Project;
  viewMode: WorkbenchViewMode;
  /** Route task id; lets the client resolve a session-only run the server doesn't know. */
  taskId?: string;
}

/** Chat-facing slice of workspace collapse state. */
export interface WorkspaceToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Chrome-internal superset; adds explicit expand handler used by the floating FAB. */
export interface WorkspaceCollapseProps extends WorkspaceToggleProps {
  onExpand: () => void;
}
