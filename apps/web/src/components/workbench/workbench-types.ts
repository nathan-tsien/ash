import type { AshLocale, Conversation } from "@ash/shared";

export interface WorkbenchShellProps {
  locale: AshLocale;
  conversations: Conversation[];
  active: Conversation;
}

/** Chat-facing slice of workspace collapse state; chat only needs to read + toggle. */
export interface WorkspaceToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Chrome-internal superset; adds explicit expand handler used by the floating FAB. */
export interface WorkspaceCollapseProps extends WorkspaceToggleProps {
  onExpand: () => void;
}
