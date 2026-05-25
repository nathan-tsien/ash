"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ash/ui/dialog";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "./settings-modal-provider";
import { SettingsNav } from "./settings-nav";
import { AccountSection } from "./sections/account-section";
import { BillingSection } from "./sections/billing-section";
import { ConnectorsSection } from "./sections/connectors-section";
import { GeneralSection } from "./sections/general-section";
import { PersonalizationSection } from "./sections/personalization-section";
import { ScheduledTasksSection } from "./sections/scheduled-tasks-section";
import { SkillsSection } from "./sections/skills-section";
import type { SettingsSectionId } from "./sections";

function renderSection(section: SettingsSectionId) {
  switch (section) {
    case "account":
      return <AccountSection />;
    case "general":
      return <GeneralSection />;
    case "billing":
      return <BillingSection />;
    case "personalization":
      return <PersonalizationSection />;
    case "scheduled-tasks":
      return <ScheduledTasksSection />;
    case "skills":
      return <SkillsSection />;
    case "connectors":
      return <ConnectorsSection />;
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

export function SettingsModal() {
  const { open, section, closeSettings, setSection } = useSettingsModal();
  const t = useTranslations("Settings");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeSettings();
      }}
    >
      <DialogContent
        className="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
        closeAriaLabel={t("closeAria")}
      >
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-[28rem] max-h-[70dvh] grid-cols-[220px_minmax(0,1fr)]">
          <SettingsNav section={section} onSelect={setSection} />
          <div className="overflow-y-auto px-6 py-5">
            {renderSection(section)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
