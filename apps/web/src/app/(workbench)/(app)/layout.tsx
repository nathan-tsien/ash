import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { TaskRunProvider } from "@/components/workbench/task-run-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  // RequireAuth wraps the app providers so a revoked/expired session redirects to
  // /login before any task-run or workbench data fetching kicks off.
  return (
    <RequireAuth>
      <SettingsModalProvider>
        <CommandPaletteProvider>
          <TaskRunProvider>{children}</TaskRunProvider>
        </CommandPaletteProvider>
      </SettingsModalProvider>
    </RequireAuth>
  );
}
