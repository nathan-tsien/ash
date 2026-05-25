"use client";

import {
  getMockSkills,
  isAshLocale,
  type AgentSkill,
  type SkillCategory,
} from "@ash/shared";
import { Switch } from "@ash/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import {
  Code2,
  Globe,
  ImageIcon,
  PenLine,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { SectionHeader } from "../section-header";

const SKILLS_STORAGE_KEY = "ash:prefs:skills";

const CATEGORY_ORDER: SkillCategory[] = [
  "browse",
  "write",
  "code",
  "data",
  "media",
];

const CATEGORY_LABEL_KEYS: Record<SkillCategory, string> = {
  browse: "skills.categoryBrowse",
  write: "skills.categoryWrite",
  code: "skills.categoryCode",
  media: "skills.categoryMedia",
  data: "skills.categoryData",
};

const CATEGORY_ICONS: Record<SkillCategory, LucideIcon> = {
  browse: Globe,
  write: PenLine,
  code: Code2,
  media: ImageIcon,
  data: Table2,
};

function readSkillOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeSkillOverrides(overrides: Record<string, boolean>) {
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(overrides));
}

interface SkillRowProps {
  skill: AgentSkill;
  enabled: boolean;
  onToggle: (skillId: string, next: boolean) => void;
}

function SkillRow({ skill, enabled, onToggle }: SkillRowProps) {
  const t = useTranslations("Settings");
  const Icon = CATEGORY_ICONS[skill.category];

  const switchControl = (
    <Switch
      checked={enabled}
      disabled={skill.requiresPhase2}
      onCheckedChange={(next) => onToggle(skill.id, next)}
      aria-label={skill.label}
    />
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{skill.label}</p>
        <p className="text-xs text-muted-foreground">{skill.description}</p>
      </div>
      {skill.requiresPhase2 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{switchControl}</span>
          </TooltipTrigger>
          <TooltipContent>{t("skills.phase2Hint")}</TooltipContent>
        </Tooltip>
      ) : (
        switchControl
      )}
    </div>
  );
}

export function SkillsSection() {
  const localeRaw = useLocale();
  const locale = isAshLocale(localeRaw) ? localeRaw : "zh";
  const t = useTranslations("Settings");
  const skills = getMockSkills(locale);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    readSkillOverrides,
  );

  const isEnabled = useCallback(
    (skill: AgentSkill) => {
      if (skill.id in overrides) return overrides[skill.id];
      return skill.enabled;
    },
    [overrides],
  );

  const handleToggle = useCallback((skillId: string, next: boolean) => {
    setOverrides((prev) => {
      const updated = { ...prev, [skillId]: next };
      writeSkillOverrides(updated);
      return updated;
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<SkillCategory, AgentSkill[]>();
    for (const category of CATEGORY_ORDER) {
      map.set(category, []);
    }
    for (const skill of skills) {
      map.get(skill.category)?.push(skill);
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: map.get(category) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [skills]);

  return (
    <div>
      <SectionHeader
        heading={t("skills.heading")}
        description={t("skills.description")}
      />

      <div className="space-y-6">
        {grouped.map(({ category, items }) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(CATEGORY_LABEL_KEYS[category])}
            </p>
            <ul className="space-y-2">
              {items.map((skill) => (
                <li key={skill.id}>
                  <SkillRow
                    skill={skill}
                    enabled={isEnabled(skill)}
                    onToggle={handleToggle}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
