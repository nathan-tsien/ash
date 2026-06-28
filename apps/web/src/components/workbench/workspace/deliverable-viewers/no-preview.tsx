"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function NoPreview({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-body-sm text-muted-foreground">{t("viewerNoPreview")}</p>
      <a href={deliverableHref(deliverable.uri)} download={deliverable.name} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-label font-medium hover:bg-accent">
        {t("deliverableDownload")}
      </a>
    </div>
  );
}
