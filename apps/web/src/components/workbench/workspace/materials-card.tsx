"use client";

import type { ProjectMaterial } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { FileText, Database, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MaterialsCardProps {
  materials: ProjectMaterial[];
}

export function MaterialsCard({ materials }: MaterialsCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("materialsTitle")}</h3>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Upload className="size-3.5" aria-hidden />
          {t("upload")}
        </Button>
      </div>
      <ul className="space-y-1.5">
        {materials.map((mat) => (
          <li
            key={mat.id}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent"
          >
            {mat.kind === "connector" ? (
              <Database className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="truncate">{mat.name}</span>
            {mat.size && (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{mat.size}</span>
            )}
          </li>
        ))}
        {materials.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyMaterials")}
          </li>
        )}
      </ul>
    </div>
  );
}
