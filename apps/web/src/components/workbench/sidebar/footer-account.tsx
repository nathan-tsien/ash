"use client";

import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useAuth } from "@/context/auth-context";

export function FooterAccount() {
  const t = useTranslations("Workbench");
  const { openSettings } = useSettingsModal();
  const { user, logout } = useAuth();

  const displayName = user?.display_name ?? user?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-start gap-2 px-2 py-2"
            aria-label={t("accountMenuOpenAria")}
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
            <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 font-normal">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openSettings("account")}>
            <Settings className="size-4" aria-hidden />
            {t("accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("accountSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
