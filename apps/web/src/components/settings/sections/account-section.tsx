"use client";

import { mockUser } from "@ash/shared";
import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

export function AccountSection() {
  const t = useTranslations("Settings");
  const tWorkbench = useTranslations("Workbench");

  return (
    <div>
      <SectionHeader
        heading={t("account.heading")}
        description={t("account.description")}
      />

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Avatar className="size-12">
          <AvatarFallback className="text-sm">
            {mockUser.avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium">{mockUser.name}</p>
          <p className="text-xs text-muted-foreground">{mockUser.email}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("account.mockBanner")}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" size="sm" disabled>
                {t("account.switchAccountAction")}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tWorkbench("accountPhase2Tooltip")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" size="sm" disabled>
                {t("account.signOutAction")}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tWorkbench("accountPhase2Tooltip")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
