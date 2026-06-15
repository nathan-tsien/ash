"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSkillCatalog } from "@/lib/praxis/use-skill-catalog";

export interface SkillPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Task-start skill selector. Lists the registered skill catalog (praxis 0.2.0
 * GET /v1/skills) in a dropdown checklist; chosen skills become removable chips.
 * The selection is sent as `skill_hints` — hints, not locks: the model may still
 * pick a different skill, so copy frames them as suggested/preferred.
 */
export function SkillPicker({ selected, onChange, disabled }: SkillPickerProps) {
  const t = useTranslations("Workbench");
  const { skills, loading, error } = useSkillCatalog();

  // No catalog (empty or unreachable): hide entirely — task start still works.
  if (loading || error || skills.length === 0) return null;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const byId = (id: string) => skills.find((s) => s.id === id);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
            <Sparkles className="size-3.5" aria-hidden />
            {t("skillPickerButton")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-sm">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("skillPickerHint")}
          </DropdownMenuLabel>
          {skills.map((s) => (
            <DropdownMenuCheckboxItem
              key={s.id}
              checked={selected.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
              onSelect={(e) => e.preventDefault()}
              className="flex-col items-start gap-0.5"
            >
              <span className="text-sm font-medium">{s.display_name}</span>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.map((id) => {
        const skill = byId(id);
        if (!skill) return null;
        return (
          <Badge key={id} variant="muted" className="gap-1">
            {skill.display_name}
            <button
              type="button"
              onClick={() => toggle(id)}
              className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("removeSkillAria")}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}
