import type { Artifact, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { ArtifactButton } from "./artifact-button";

export async function ArtifactsCard({
  locale,
  artifacts,
}: {
  locale: AshLocale;
  artifacts: Artifact[];
}) {
  const t = await getTranslations("Workbench");

  return (
    <div className="space-y-2 pb-8">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
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
