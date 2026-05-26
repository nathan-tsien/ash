"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { cn } from "@ash/ui/lib/utils";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

interface OptionButtonProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  showPhase2?: boolean;
  phase2Label?: string;
}

function OptionButton({
  label,
  selected,
  disabled,
  showPhase2,
  phase2Label,
}: OptionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "gap-2",
        selected && "border-primary bg-accent text-foreground",
      )}
    >
      {label}
      {showPhase2 && phase2Label && (
        <Badge variant="muted">{phase2Label}</Badge>
      )}
    </Button>
  );
}

export function PersonalizationSection() {
  const t = useTranslations("Settings");

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
              selected
            />
            <OptionButton
              label={t("personalization.themeSystem")}
              selected={false}
              disabled
              showPhase2
              phase2Label={t("phase2Badge")}
            />
            <OptionButton
              label={t("personalization.themeDark")}
              selected={false}
              disabled
              showPhase2
              phase2Label={t("phase2Badge")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("personalization.densityLabel")}</p>
          <div className="flex flex-wrap gap-2">
            <OptionButton
              label={t("personalization.densityComfortable")}
              selected
            />
            <OptionButton
              label={t("personalization.densityCompact")}
              selected={false}
              disabled
              showPhase2
              phase2Label={t("phase2Badge")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("personalization.fontLabel")}</p>
          <div className="flex flex-wrap gap-2">
            <OptionButton label={t("personalization.fontSans")} selected />
            <OptionButton
              label={t("personalization.fontSerif")}
              selected={false}
              disabled
              showPhase2
              phase2Label={t("phase2Badge")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
