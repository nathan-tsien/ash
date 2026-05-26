import { WorkbenchChrome } from "./workbench-chrome";
import type { WorkbenchShellProps } from "./workbench-types";
import { WorkbenchWorkspace } from "./workspace/workbench-workspace";

/** Main three-pane workbench chrome (Sidebar / Chat / Workspace). */
export function WorkbenchShell(props: WorkbenchShellProps) {
  return (
    <WorkbenchChrome
      key={props.active.id}
      locale={props.locale}
      conversations={props.conversations}
      active={props.active}
      chatBanner={props.chatBanner}
      workspacePanel={
        <WorkbenchWorkspace locale={props.locale} active={props.active} />
      }
    />
  );
}
