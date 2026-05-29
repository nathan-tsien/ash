"use client";

import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";
import { useAuth } from "@/context/auth-context";

export function AccountSection() {
  const t = useTranslations("Settings");
  const { user, logout } = useAuth();

  const displayName = user?.display_name ?? user?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <SectionHeader
        heading={t("account.heading")}
        description={t("account.description")}
      />

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Avatar className="size-12">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => logout()}>
          <LogOut className="size-4" aria-hidden />
          {t("account.signOutAction")}
        </Button>
      </div>
    </div>
  );
}
