"use client";

import type { Artifact, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { useTranslations } from "next-intl";
import { ArtifactButton } from "./artifact-button";

export function ArtifactsCard({
  locale,
  artifacts,
}: {
  locale: AshLocale;
  artifacts: Artifact[];
}) {
  const t = useTranslations("Workbench");

  return (
    <div className="space-y-2 pb-8">
      <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
        {t("artifactsHeading")}
      </h2>
      {artifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyArtifacts")}</p>
      ) : (
        <div className="space-y-2">
          {artifacts.map((a) => (
            <ArtifactButton
              key={a.id}
              artifact={a}
              updatedAtLabel={formatRelativeTime(a.updatedAt, locale)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
