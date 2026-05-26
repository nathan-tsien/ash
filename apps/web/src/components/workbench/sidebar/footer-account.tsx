"use client";

import { mockUser } from "@ash/shared";
import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";

export function FooterAccount() {
  const t = useTranslations("Workbench");
  const { openSettings } = useSettingsModal();

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
              <AvatarFallback className="text-[11px]">
                {mockUser.avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium">{t("accountLabel")}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {t("accountSub")}
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
              <AvatarFallback className="text-[10px]">
                {mockUser.avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{mockUser.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {mockUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openSettings("account")}>
            <Settings className="size-4" aria-hidden />
            {t("accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            {t("accountSwitch")}
            <Badge variant="muted" className="ml-auto">
              Phase 2
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            {t("accountSignOut")}
            <Badge variant="muted" className="ml-auto">
              Phase 2
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
