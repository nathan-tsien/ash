"use client";

import { cn } from "@ash/ui/lib/utils";
import {
  CalendarClock,
  CreditCard,
  Palette,
  Plug,
  Settings2,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SETTINGS_SECTION_GROUPS,
  type SettingsSectionId,
} from "./sections";

const SECTION_ICONS: Record<SettingsSectionId, LucideIcon> = {
  account: User,
  general: Settings2,
  billing: CreditCard,
  personalization: Palette,
  "scheduled-tasks": CalendarClock,
  skills: Sparkles,
  connectors: Plug,
};

const NAV_LABEL_KEYS: Record<SettingsSectionId, string> = {
  account: "navAccount",
  general: "navGeneral",
  billing: "navBilling",
  personalization: "navPersonalization",
  "scheduled-tasks": "navScheduledTasks",
  skills: "navSkills",
  connectors: "navConnectors",
};

interface SettingsNavProps {
  section: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

export function SettingsNav({ section, onSelect }: SettingsNavProps) {
  const t = useTranslations("Settings");

  return (
    <nav
      className="sticky top-0 flex flex-col gap-4 overflow-y-auto border-r border-border px-3 py-4"
      aria-label={t("title")}
    >
      {SETTINGS_SECTION_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-2 text-label font-semibold uppercase tracking-wider text-muted-foreground">
            {group.id === "account"
              ? t("groupAccountLabel")
              : t("groupFeaturesLabel")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((id) => {
              const Icon = SECTION_ICONS[id];
              const active = section === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(NAV_LABEL_KEYS[id])}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
