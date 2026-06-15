"use client";

import { useTranslations } from "next-intl";
import { useSkillCatalog } from "@/lib/praxis/use-skill-catalog";
import { SectionHeader } from "../section-header";

export function SkillsSection() {
  const t = useTranslations("Settings");
  const { skills, loading, error } = useSkillCatalog();

  return (
    <div>
      <SectionHeader heading={t("skills.heading")} description={t("skills.description")} />

      {loading && <p className="text-body text-muted-foreground">{t("skills.loading")}</p>}
      {error && <p className="text-body text-destructive">{t("skills.error")}</p>}
      {!loading && !error && skills.length === 0 && (
        <p className="text-body text-muted-foreground">{t("skills.empty")}</p>
      )}

      {!loading && !error && skills.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {skills.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-card p-3">
              <p className="text-body-sm font-medium text-foreground">{s.display_name}</p>
              <p className="mt-0.5 text-label font-normal text-muted-foreground">{s.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
