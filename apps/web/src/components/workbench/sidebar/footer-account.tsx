"use client";

import { mockUser } from "@ash/shared";
import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FooterAccount() {
  const t = useTranslations("Workbench");
  return (
    <div className="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-start gap-2 px-2 py-2"
        asChild
      >
        <Link href="/settings">
          <Avatar className="size-8">
            <AvatarFallback className="text-[11px]">{mockUser.avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium">{t("accountLabel")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t("accountSub")}</p>
          </div>
          <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
