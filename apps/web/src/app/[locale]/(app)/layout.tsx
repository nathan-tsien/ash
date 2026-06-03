import type { ReactNode } from "react";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { TaskRunProvider } from "@/components/workbench/task-run-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsModalProvider>
      <CommandPaletteProvider>
        <TaskRunProvider>{children}</TaskRunProvider>
      </CommandPaletteProvider>
    </SettingsModalProvider>
  );
}
