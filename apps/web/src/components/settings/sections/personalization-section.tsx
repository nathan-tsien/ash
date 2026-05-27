"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { cn } from "@ash/ui/lib/utils";
import { useTheme } from "@ash/ui/lib/theme-provider";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

interface OptionButtonProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function OptionButton({
  label,
  selected,
  disabled,
  onClick,
}: OptionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "gap-2",
        selected && "border-primary bg-accent text-foreground",
      )}
    >
      {label}
    </Button>
  );
}

export function PersonalizationSection() {
  const t = useTranslations("Settings");
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <SectionHeader
        heading={t("personalization.heading")}
        description={t("personalization.description")}
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("personalization.themeLabel")}</p>
          <div className="flex flex-wrap gap-2">
            <OptionButton
              label={t("personalization.themeLight")}
              selected={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <OptionButton
              label={t("personalization.themeSystem")}
              selected={theme === "system"}
              onClick={() => setTheme("system")}
            />
            <OptionButton
              label={t("personalization.themeDark")}
              selected={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t("personalization.densityLabel")}</p>
            <Badge variant="muted">{t("phase2Badge")}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <OptionButton
              label={t("personalization.densityComfortable")}
              selected
              disabled
            />
            <OptionButton
              label={t("personalization.densityCompact")}
              selected={false}
              disabled
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t("personalization.fontLabel")}</p>
            <Badge variant="muted">{t("phase2Badge")}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <OptionButton label={t("personalization.fontSans")} selected disabled />
            <OptionButton
              label={t("personalization.fontSerif")}
              selected={false}
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}
