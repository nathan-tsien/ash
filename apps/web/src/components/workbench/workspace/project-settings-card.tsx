"use client";

import type { Project } from "@ash/shared";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ProjectSettingsCardProps {
  project: Project;
}

export function ProjectSettingsCard({ project }: ProjectSettingsCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Settings className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{t("projectSettings")}</h3>
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("projectName")}</p>
          <p className="text-sm">{project.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("projectDescription")}</p>
          <p className="text-sm">{project.description}</p>
        </div>
        {project.connectors.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t("connectors")}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {project.connectors.map((conn) => (
                <span
                  key={conn.id}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                >
                  {conn.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
