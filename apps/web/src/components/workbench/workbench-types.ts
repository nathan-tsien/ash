import type { AshLocale, Conversation } from "@ash/shared";
import type { ReactNode } from "react";

export interface WorkbenchShellProps {
  locale: AshLocale;
  conversations: Conversation[];
  active: Conversation;
  /** Optional banner rendered above the chat scroll area (e.g. Showcase Replay demo intro). */
  chatBanner?: ReactNode;
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
